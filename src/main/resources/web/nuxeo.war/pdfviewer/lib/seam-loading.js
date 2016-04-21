

Seam.Remoting.loadingMsgDiv = $('loadingMsg_');
Seam.Remoting.loadingMessage = "Processando, Aguarde...";

Seam.Remoting.displayLoadingMessage = function() {


    if (!Seam.Remoting.loadingMsgDiv) {

        Seam.Remoting.loadingMsgDiv = document.createElement('div');
        var msgDiv = Seam.Remoting.loadingMsgDiv;
        msgDiv.setAttribute('id', 'loadingMsg_');

        msgDiv.style.position = "absolute";
        msgDiv.style.width = "250px";
        msgDiv.style.height = "80px";
        msgDiv.style.top = "300px";
        msgDiv.style.left = "400px";
        msgDiv.style.background = "#CCCCCC";
        msgDiv.style.color = "black";
        msgDiv.style.fontFamily = "Verdana,Helvetica,Arial";
        msgDiv.style.fontWeight = "bold";
        msgDiv.style.fontSize = "14px";
        msgDiv.style.padding = "2px";
        msgDiv.style.border = "2px solid #CCC";
        msgDiv.style.borderRadius = "6px";

        document.body.appendChild(msgDiv);

        var text = document.createTextNode(Seam.Remoting.loadingMessage);
        msgDiv.appendChild(text);

    } else {
        Seam.Remoting.loadingMsgDiv.innerHTML = Seam.Remoting.loadingMessage;
        Seam.Remoting.loadingMsgDiv.style.visibility = 'visible';
    }

}

Seam.Remoting.hideLoadingMessage = function()
{
    //
    //    if (Seam.Remoting.loadingMsgDiv){
    //         Modalbox.hide({
    //
    //        });
    //    }
    Seam.Remoting.loadingMsgDiv.style.visibility = 'hidden';
}
