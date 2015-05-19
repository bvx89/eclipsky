package no.hal.eclipsky.services.workspace.http;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.net.URL;

import javax.servlet.ServletContext;

import no.hal.eclipsky.services.common.ResourceRef;
public class AceEditorHelper {
        public static class Options {
                public String requestUrl;
                public String editorName;
                public String projectId;
                public String mode;
                public boolean embed;
                public ResourceRef[] resourceRefs;
				public int startIndex;
        }
        public void writeEditorHtml(PrintWriter writer, Options options) throws IOException {          
                if (options.mode == null) {
                        options.mode = getEditorMode(options.editorName);
                }
                if (! options.embed) {
                        writer.print("<html lang=\"en\">\n" +
                                        "\t<head><title>" + options.projectId + "</title>\n" +
                                    	"\t<link type=\"text/css\" rel=\"stylesheet\" href=\"css/styles.css\" />" +
                                        "\t</head>\n" +
                                        "\t<body>\n");
                }
       
                /*
                   <nav id="tabs">
                        <ul>
                                <li id="active"><a href="#0">Card.java</a></li>
                                <li><a href="#1">CardDeck.java</a></li>
                        </ul>
                        </nav>
                 */
                writer.println("\t\t<nav id=\"tabs\">\n" +
                                                "\t\t\t<ul>");
                if (options.resourceRefs != null) {
                        for (int i = 0; i < options.resourceRefs.length; i++) {
                                String resourceName = options.resourceRefs[i].getResourceName();
                                writer.println("\t\t\t\t<li" + (i == options.startIndex ? " class=\"active\"" : "")
                                		+ "><a href=\"#" + resourceName + "\">" + resourceName + "</a></li>");
                        }
                }
                writer.println("\t\t\t</ul>\n" +
                                "\t\t</nav>");
               
               
                writer.print("\t<div id=\"editor_wrapper\">");
                writer.print("\t\t<div id=\"main_editor\">");
//              writer.print(XmlResponseFormatter.escapeHtml(stringContent));
                writer.print("\t\t</div>\n");
                writer.print("\t\t<div id=\"dragbar\"></div>\n");
                writer.print("\t\t</div>\n");
               
                /*
                  <div id="tests">
                        <h1>Tests</h1>
                        <ul>
                                <li>Result 1</li>
                                <li>Result 2</li>
                        </ul>
                        <button name="test" id="btn_test">Test</button>
                </div>
                 */
                writer.println("\t\t<div id=\"tests\">\n"
                                + "\t\t\t<div id=\"tests_headline\"><h1>Tests</h1><span id=\"refresh_status\">Refreshed</span></div>\n"
                                + "\t\t\t<div id=\"tests_div\"><ul id=\"test_result\"></ul></div>\n"
                                + "\t\t\t<button name=\"test\" id=\"btn_test\">Test</button>\n"
                                + "\t\t</div>\n"
                                + "\t</div>\n");
               
                /*
                 *             
                 *      <div id="controls" class="clearfix">
                                <button name="run" id="btn_run">Kj&oslash;r</button>
                        </div>
                 */
                writer.println("\t\t<div id=\"controls\">\n"
                                + "\t\t\t<button name=\"run\" id=\"btn_run\">Kompiler og kj&oslash;r</button>\n"
                                + "\t\t</div>\n");
               
                writer.println("\t\t<div id=\"console\">\n"
                                + "\t\t\t<textarea readonly></textarea>\n"
                                + "\t\t</div>\n");
               
                writer.println(
                				"\t\t\t<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js\"></script>\n" +
                                "\t\t\t<script src=\"/ace/ace.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/ace/ext-language_tools.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/js/connector.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/js/cookiemanager.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/js/editor.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/js/interfacer.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n" +
                                "\t\t\t<script src=\"/js/lib/jquery.details.min.js\" type=\"text/javascript\" charset=\"utf-8\"></script>\n"
                );
                writer.println("\t\t\t<script>\n" +
                                "\t\t\tvar editors = [");
                if (options.resourceRefs != null) {
                        for (int i = 0; i < options.resourceRefs.length; i++) {
                                ResourceRef resourceRef = options.resourceRefs[i];
                                String resourceName = resourceRef.getResourceName(), language = null;
                                int pos = resourceName.lastIndexOf('.');
                                if (pos > 0) {
                                        language = resourceName.substring(pos + 1);
                                }
                                if (i > 0) {
                                        writer.print(",");
                                }
                                writer.print("{resourceRef: '" + resourceRef.getPackageName() + "/" + resourceName);
                                if (language != null) {
                                        writer.print("', language: '" + language + "'");
                                }
                                writer.println(", pos: {row: 0, column: 0}}");
                        }
                }
                writer.println("];\n" +
                                "\t\t\tvar currentEditor = editor.init('main_editor', '" + options.requestUrl + "', '" + options.projectId + "', "
                                		+ "editors, " + options.startIndex + ");\n" +
                                "interfacer.init(currentEditor);" +
                                "\t\t\t</script>");
                if (! options.embed) { 
                        writer.println("\t</body>\n</html>\n");
                }
        }
        public String getEditorMode(String resourceName) {
                int pos = resourceName.lastIndexOf('.');
                String ext = (pos < 0 ? resourceName : resourceName.substring(pos + 1));
                switch (ext) {
                case "py": return "python";
                case "js": return "javascript";
                default: return ext;
                }
        }
}