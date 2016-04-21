package org.nuxeo.platform.pdfviewer.rest;

import static org.jboss.seam.ScopeType.EVENT;

import java.io.Serializable;

import javax.servlet.http.HttpServletResponse;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.nuxeo.ecm.core.api.CoreSession;
import org.nuxeo.ecm.core.api.DocumentModel;
import org.nuxeo.ecm.core.api.IdRef;
import org.nuxeo.ecm.platform.ui.web.api.NavigationContext;
import org.nuxeo.ecm.platform.ui.web.restAPI.BaseNuxeoRestlet;
import org.nuxeo.ecm.platform.util.RepositoryLocation;
import org.restlet.data.Request;
import org.restlet.data.Response;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.security.Principal;
import javax.servlet.http.HttpServletRequest;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.nuxeo.ecm.core.api.event.CoreEventConstants;
import org.nuxeo.ecm.core.api.event.DocumentEventCategories;
import org.nuxeo.ecm.core.api.security.SecurityConstants;
import org.nuxeo.ecm.core.event.Event;
import org.nuxeo.ecm.core.event.EventService;
import org.nuxeo.ecm.core.event.impl.DocumentEventContext;
import org.nuxeo.runtime.api.Framework;

/**
 * Stateless Restlet to load/save/update annotations into the documents
 *
 * @author Klyff Harlley <klyff@efficeon.com.br>
 *
 */
@Name("annotation")
@Scope(EVENT)
public class AnnotationServiceRestlet extends BaseNuxeoRestlet implements Serializable {

   /**
    *
    */
   private static final long serialVersionUID = -23847283648723L;

   private static final Log log = LogFactory.getLog(AnnotationServiceRestlet.class);
//
   protected static final String FACET_ANNOTATION = "Annotation";
   //
   protected static final String EVENT_SAVE = "annotationSaved";
   protected static final String EVENT_LOAD = "annotationLoaded";

   //
   @In(create = true)
   protected transient NavigationContext navigationContext;

   protected CoreSession documentManager;

   @SuppressWarnings("deprecation")
   @Override
   public void handle(Request req, Response res) {

      try {

         HttpServletRequest htreq = getHttpRequest(req);

         Principal currentUser = getUserPrincipal(req);

         String repo = (String) req.getAttributes().get("repo");
         String docID = (String) req.getAttributes().get("docID");

         String annotation = null;

         //Read Ajax data
         StringBuilder jb = new StringBuilder();
         String line = null;
         try {
            BufferedReader reader = htreq.getReader();
            while ((line = reader.readLine()) != null) {
               jb.append(line);
            }
         } catch (Exception e) {
            log.error("Error to load Annotation JSON, check the fullstacktrace", e);
         }

         annotation = jb.toString();

         if (docID == null || docID.isEmpty()) {
            throw new NullPointerException("Invalid document");
         }

         DocumentModel doc = null;
         try {

            if ((repo == null || repo.isEmpty()) && navigationContext.getCurrentServerLocation() == null) {

               if (repo == null || repo.isEmpty()) {
                  repo = "default";
               }

               navigationContext.setCurrentServerLocation(new RepositoryLocation(repo));
            }

            documentManager = navigationContext.getOrCreateDocumentManager();

            //Get document
            if (docID != null) {
               doc = documentManager.getDocument(new IdRef(docID));
            }
            //Check document
            if (doc == null) {
               throw new NullPointerException("No document available with ID " + docID);
            }

            //Load Annotations
            if (annotation == null || annotation.isEmpty()) {

               annotation = load(doc, documentManager, currentUser);

               //Save Annotations
            } else {
               annotation = save(doc, documentManager, currentUser, annotation);
            }

         } catch (Exception e) {
            handleError(res, e);
            log.error("Error processing annotations save action", e);
            return;
         }

         HttpServletResponse response = getHttpResponse(res);
         response.setBufferSize(1024);

         byte[] content = annotation.getBytes();

         response.setContentType("application/json");
         response.setContentLength(content.length);

         PrintWriter writer = response.getWriter();
         writer.write(annotation);

         /*Some time Nuxeo filter throws eceptions when we Flush the Writer here...*/
         writer.flush();
         writer.close();
         response.flushBuffer();
         
         
      } catch (Exception e) {
         handleError(res, e);
         log.error("Error on Execution of AnnotationServiceRestlet: " + e.getLocalizedMessage(), e);
      }
   }

   /**
    * Save annotations method - They will add the Facet Annotation if the document hasn't
    *
    * @param doc
    * @param session
    * @param currentUser
    * @param changedAnnotations
    * @return
    * @throws Exception
    */
   protected String save(DocumentModel doc, CoreSession session, Principal currentUser, String changedAnnotations) throws Exception {

      if (!doc.hasFacet(FACET_ANNOTATION)) {
         doc.addFacet(FACET_ANNOTATION);
      }

      //Check if something existis...
      Serializable savedAnnotations = doc.getPropertyValue("annotation:content");
      if (savedAnnotations != null) {
         changedAnnotations = updateAnnotations(savedAnnotations.toString(), changedAnnotations);

      }

      doc.setPropertyValue("annotation:content", changedAnnotations);
      doc = documentManager.saveDocument(doc);
      documentManager.save();

      fireEvent(documentManager, doc, currentUser, EVENT_SAVE);

      return changedAnnotations;
   }

   /**
    * Resolve the update/remove/insert Annotation onto the saved's JSON;
    *
    * @param existentAnnotationJson
    * @param changedAnnotationJSON
    * @return
    */
   protected String updateAnnotations(String existentAnnotationJson, String changedAnnotationJSON) {
      String out = existentAnnotationJson;

      JSONArray arraySaved = JSONArray.fromObject(existentAnnotationJson);
      JSONArray arrayChanged = JSONArray.fromObject(changedAnnotationJSON);
      JSONArray arrayNew = new JSONArray();

      arrayNew.addAll(arraySaved);

      for (int i = 0; i < arrayChanged.size(); i++) {
         JSONObject changed = arrayChanged.getJSONObject(i);

         if ("insert".equalsIgnoreCase(changed.getString("modified"))) {

            insertAnnotation(arrayNew, changed);

         } else if ("delete".equalsIgnoreCase(changed.getString("modified"))) {

            removeAnnotation(arrayNew, changed);

         } else if ("update".equalsIgnoreCase(changed.getString("modified"))) {

            updateAnnotation(arrayNew, changed);

         }
      }

      if (!arrayNew.isEmpty()) {
         out = arrayNew.toString();
      } else {
         out = null;
      }

      return out;

   }

   /**
    * Insert new Annotations to JSONAray
    *
    * @param array
    * @param toInsert
    */
   private void insertAnnotation(JSONArray array, JSONObject toInsert) {
      boolean found = false;
      for (int i = 0; i < array.size(); i++) {
         JSONObject saved = array.getJSONObject(i);
         if (saved.getString("id").equalsIgnoreCase(toInsert.getString("id"))) {
            found = true;
            array.remove(saved);
            array.add(i, toInsert);
            break;
         }
      }

      if (!found) {
         array.add(toInsert);
      }

   }

   /**
    * Remove annotations from JSONArray
    *
    * @param array
    * @param toRemove
    * @return
    */
   private boolean removeAnnotation(JSONArray array, JSONObject toRemove) {
      boolean res = false;
      for (int i = 0; i < array.size(); i++) {
         JSONObject saved = array.getJSONObject(i);
         if (saved.getString("id").equalsIgnoreCase(toRemove.getString("id"))) {
            res = array.remove(saved);
            break;
         }
      }
      return res;
   }

   /**
    * Update the JSONArray add/remove/modify received Annotations
    *
    * @param array
    * @param toUpdate
    * @return
    */
   private boolean updateAnnotation(JSONArray array, JSONObject toUpdate) {
      boolean res = false;
      for (int i = 0; i < array.size(); i++) {
         JSONObject saved = array.getJSONObject(i);
         if (saved.getString("id").equalsIgnoreCase(toUpdate.getString("id"))) {
            res = array.remove(saved);
            array.add(i, toUpdate);
            break;
         }
      }
      return res;
   }

   /**
    * Load the annotations from Document
    *
    * @param doc
    * @param session
    * @param currentUser
    * @return
    * @throws Exception
    */
   protected String load(DocumentModel doc, CoreSession session, Principal currentUser) throws Exception {

      if (doc.hasFacet(FACET_ANNOTATION)) {

         Serializable annotations = doc.getPropertyValue("annotation:content");
         if (annotations == null) {
            return "";
         }

         String readOnly = session.hasPermission(currentUser, doc.getRef(), SecurityConstants.WRITE) ? "false" : "true";

         if (annotations == null) {

            return "";

         } else {

            //Configure the response to say that annotation can't be changed by current user
            String json = "{\"settings\":[{\"key\":\"ANNOTATIONS_READ_ONLY\",\"value\":\"" + readOnly + "\"}],\"annotations\":"
                    + "" + annotations + "}";

            fireEvent(documentManager, doc, currentUser, EVENT_LOAD);
            return (String) json;
         }

      } else {
         return "";
      }

   }

   /**
    * Fire some events for audit/history of document about annotations
    *
    * @param session
    * @param doc
    * @param currentUser
    * @param eventType
    * @throws Exception
    */
   protected void fireEvent(CoreSession session, DocumentModel doc, Principal currentUser, String eventType) throws Exception {
      try {
         DocumentEventContext ctx = new DocumentEventContext(session, currentUser, doc);
         ctx.setCategory(DocumentEventCategories.EVENT_DOCUMENT_CATEGORY);
         ctx.setProperty(CoreEventConstants.DOC_LIFE_CYCLE, doc.getCurrentLifeCycleState());
         ctx.setProperty(CoreEventConstants.SESSION_ID, doc.getSessionId());
         Event event = ctx.newEvent(eventType);

         EventService evtService = Framework.getService(EventService.class
         );

         log.debug(
                 "Sending scheduled event id=" + event + ", category="
                 + DocumentEventCategories.EVENT_DOCUMENT_CATEGORY);

         evtService.fireEvent(event);
      } catch (Exception ex) {
         log.error("Erro ao lancar evento: " + EVENT_SAVE, ex);
      }

   }
}
