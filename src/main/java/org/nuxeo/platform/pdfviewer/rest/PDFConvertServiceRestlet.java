package org.nuxeo.platform.pdfviewer.rest;

import static org.jboss.seam.ScopeType.EVENT;

import java.io.Serializable;
import java.util.HashMap;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.nuxeo.ecm.core.api.Blob;
import org.nuxeo.ecm.core.api.ClientException;
import org.nuxeo.ecm.core.api.CoreSession;
import org.nuxeo.ecm.core.api.DocumentModel;
import org.nuxeo.ecm.core.api.IdRef;
import org.nuxeo.ecm.core.api.blobholder.BlobHolder;
import org.nuxeo.ecm.core.convert.api.ConversionService;
import org.nuxeo.ecm.platform.ui.web.api.NavigationContext;
import org.nuxeo.ecm.platform.ui.web.restAPI.BaseNuxeoRestlet;
import org.nuxeo.ecm.platform.util.RepositoryLocation;
import org.nuxeo.runtime.api.Framework;
import org.restlet.data.Request;
import org.restlet.data.Response;

/**
 * Restlet to convert documents to PDF format
 *
 * @author Klyff Harlley <klyff@efficeon.com.br>
 *
 */
@Name("pdfconvert")
@Scope(EVENT)
public class PDFConvertServiceRestlet extends BaseNuxeoRestlet implements Serializable {

   /**
    *
    */
   private static final long serialVersionUID = 198765478L;

   private static final Log log = LogFactory.getLog(PDFConvertServiceRestlet.class);

   @In(create = true)
   protected transient NavigationContext navigationContext;

   protected CoreSession documentManager;

   @SuppressWarnings("deprecation")
   @Override
   public void handle(Request req, Response res) {

      try {

         String docID = (String) req.getAttributes().get("docID");

         if (docID == null || docID.isEmpty()) {
            throw new NullPointerException("Documento informado invalido");
         }

         DocumentModel doc = null;
         try {

            navigationContext.setCurrentServerLocation(new RepositoryLocation("default"));
            documentManager = navigationContext.getOrCreateDocumentManager();

            if (docID != null) {
               doc = documentManager.getDocument(new IdRef(docID));
            }

         } catch (Exception e) {
            handleError(res, e);
            log.error("Error when try to configure target Repository and Document ", e);
            return;
         }

         ConversionService service = Framework.getLocalService(ConversionService.class);

         BlobHolder bh = doc.getAdapter(BlobHolder.class);
         if (bh == null) {
            throw new NullPointerException("Documento informado nao contem um arquivo valido");
         }

         Blob result = bh.getBlob();

         if (!"application/pdf".equalsIgnoreCase(result.getMimeType())) {

            try {

               //Using any Nuxeo provides
               BlobHolder pdfBh = service.convert("any2pdf", bh, new HashMap<String, Serializable>());
               result = pdfBh.getBlob();

            } catch (Exception ex) {
               log.error("Error to convert input document to PDF: " + ex.getLocalizedMessage(), ex);
               //Using any Nuxeo provides
               BlobHolder pdfBh = service.convertToMimeType("application/pdf", bh, new HashMap<String, Serializable>());
               result = pdfBh.getBlob();
            }

         }

         HttpServletResponse response = getHttpResponse(res);

         byte[] content = result.getByteArray();

         response.setContentType("application/pdf");
         response.setContentLength(content.length);
         response.addHeader("Content-disposition", "attachment; filename=\"" + doc.getTitle() + ".pdf\"");

         ServletOutputStream servletOutputStream = response.getOutputStream();
         servletOutputStream.write(content, 0, content.length);

         servletOutputStream.flush();
         servletOutputStream.close();

         response.flushBuffer();

      } catch (Exception e) {
         handleError(res, e);
         log.error("Error to execute PDF Conversion " + e.getLocalizedMessage(), e);
      }
   }
}
