import javax.tools.*;
import java.io.*;
import java.net.URI;
import java.util.*;

public class PlaygroundRunner {
  public static String run(String source) {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    PrintStream originalOut = System.out, originalErr = System.err;
    try {
      JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
      if (compiler == null) return "ERROR: Java compiler is unavailable.";
      DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
      Map<String, ByteArrayOutputStream> classes = new HashMap<>();
      StandardJavaFileManager standard = compiler.getStandardFileManager(diagnostics, null, null);
      JavaFileManager manager = new ForwardingJavaFileManager<StandardJavaFileManager>(standard) {
        public JavaFileObject getJavaFileForOutput(Location location, String name, JavaFileObject.Kind kind, FileObject sibling) {
          return new SimpleJavaFileObject(URI.create("memory:///" + name.replace('.', '/') + kind.extension), kind) {
            public OutputStream openOutputStream() { ByteArrayOutputStream bytes = new ByteArrayOutputStream(); classes.put(name, bytes); return bytes; }
          };
        }
      };
      JavaFileObject input = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
        public CharSequence getCharContent(boolean ignore) { return source; }
      };
      boolean success = compiler.getTask(null, manager, diagnostics, Arrays.asList("-proc:none"), null, Arrays.asList(input)).call();
      if (!success) {
        StringBuilder errors = new StringBuilder("ERROR: ");
        for (Diagnostic<?> d : diagnostics.getDiagnostics()) errors.append("Line ").append(d.getLineNumber()).append(": ").append(d.getMessage(Locale.ENGLISH)).append('\n');
        return errors.toString();
      }
      ClassLoader loader = new ClassLoader(PlaygroundRunner.class.getClassLoader()) {
        protected Class<?> findClass(String name) throws ClassNotFoundException {
          ByteArrayOutputStream bytes = classes.get(name);
          if (bytes == null) throw new ClassNotFoundException(name);
          byte[] data = bytes.toByteArray(); return defineClass(name, data, 0, data.length);
        }
      };
      PrintStream stream = new PrintStream(new OutputStream() {
        public void write(int b) { if (output.size() < 64000) output.write(b); }
      }, true, "UTF-8");
      System.setOut(stream); System.setErr(stream);
      Class<?> main = loader.loadClass("Main");
      main.getMethod("main", String[].class).invoke(null, (Object)new String[0]);
      manager.close();
      return output.toString("UTF-8");
    } catch (Throwable e) {
      Throwable cause = e.getCause() == null ? e : e.getCause();
      return "ERROR: " + cause.toString();
    } finally { System.setOut(originalOut); System.setErr(originalErr); }
  }
}
