package org.nuxeo.platform.pdfviewer.actions;

import java.io.Serializable;
import java.security.Principal;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.annotations.remoting.WebRemote;
import org.jboss.seam.annotations.web.RequestParameter;
import org.nuxeo.ecm.core.api.CoreSession;
import org.nuxeo.ecm.core.api.DocumentLocation;
import org.nuxeo.ecm.core.api.DocumentModel;
import org.nuxeo.ecm.core.api.impl.DocumentLocationImpl;
import org.nuxeo.ecm.core.convert.api.ConverterCheckResult;
import org.nuxeo.ecm.platform.ui.web.api.NavigationContext;
import org.nuxeo.ecm.platform.ui.web.rest.RestHelper;
import org.nuxeo.ecm.platform.ui.web.rest.api.URLPolicyService;
import org.nuxeo.ecm.platform.ui.web.util.BaseURL;
import org.nuxeo.ecm.platform.url.DocumentViewImpl;
import org.nuxeo.ecm.platform.url.api.DocumentView;
import org.nuxeo.ecm.platform.web.common.vh.VirtualHostHelper;
import org.nuxeo.runtime.api.Framework;

/**
 * @author Klyff Harlley - Based on Florent BONNET
 */
@Name("ViewerSeam")
@Scope(ScopeType.CONVERSATION)
public class PDFViewerSeam implements Serializable {

   private static final Log log = LogFactory.getLog(PDFViewerSeam.class);

   protected Map<String, ConverterCheckResult> pdfConverterForTypes;

   protected static final String PDF_MIMETYPE = "application/pdf";

   public static final String PREVIEW_POPUP_VIEW = "smartpreview";

   @In(create = true, required = false)
   CoreSession documentManager;

   @In(create = true)
   NavigationContext navigationContext;

   @In(create = true)
   protected Principal currentUser;

   @RequestParameter
   private String docRef;

   @RequestParameter
   private String fileFieldFullName;

   @RequestParameter
   private String filename;

   @WebRemote
   public String currentDocument(String param) {
      return navigationContext.getCurrentDocument().getId();
   }

   @WebRemote
   public String currentRepository(String param) {
      return documentManager.getRepositoryName();
   }

   @WebRemote
   public String currentUser(String param) {
      return currentUser.getName();
   }

   @WebRemote
   public String baseURL(String param) {
      return BaseURL.getBaseURL();
   }

   public String getPreviewURL() {
      DocumentModel currentDocument = navigationContext.getCurrentDocument();
      if (currentDocument == null) {
         return null;
      }
      return getPreviewPopupURL(currentDocument, true);
   }

   public String getPreviewWithBlobPostProcessingURL() {
      String url = getPreviewURL();
      url += "?blobPostProcessing=true";
      return url;
   }

   public String getCurrentDocumentPreviewPopupURL() {
      return getPreviewPopupURL(navigationContext.getCurrentDocument());
   }

   public String getPreviewPopupURL(DocumentModel doc) {
      return getPreviewPopupURL(doc, false);
   }

   /**
    * @since 5.7
    */
   public String getPreviewPopupURL(DocumentModel doc, boolean newConversation) {
      DocumentLocation docLocation = new DocumentLocationImpl(doc.getRepositoryName(), doc.getRef());
      DocumentView docView = new DocumentViewImpl(docLocation, PREVIEW_POPUP_VIEW);
      docView.setPatternName("id");
      URLPolicyService urlPolicyService = Framework.getLocalService(URLPolicyService.class);
      String url = urlPolicyService.getUrlFromDocumentView(docView, null);
      if (!newConversation) {
         url = RestHelper.addCurrentConversationParameters(url);
      }
      return VirtualHostHelper.getContextPathProperty() + "/" + url;
   }

}
