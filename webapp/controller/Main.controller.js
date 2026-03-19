sap.ui.define([
    "./BaseController",
    "sap/m/Dialog",
    "sap/m/Button",
], (BaseController, Dialog, Button) => {
    "use strict";

    return BaseController.extend("zalopez.onlyfortesting.controller.Main", {
        onInit() {
            this.localModel = this.getModel("localModel");
        },
        onPhotoChangeMaterial(oEvent) {
            const oPhoto = oEvent.getParameter("photo");
            if (!oPhoto) return;

            let aPhotos = this.localModel.getProperty("/aPhoto") || [];

            aPhotos = [...aPhotos, oPhoto];

            this.localModel.setProperty("/aPhoto", aPhotos);
        },
        onViewPhoto(oEvent) {
            const oContext = oEvent.getParameter("listItem").getBindingContext("localModel");
            const sImageSrc = oContext.getProperty("dataURL");

            if (!this._photoDialog) {

                this._fullImageControl = new sap.m.Image({
                    width: "100%",
                    height: "auto",
                    densityAware: false
                }).addStyleClass("photoViewerImage");

                this._photoDialog = new Dialog({
                    title: "Vista de Foto",
                    stretch: sap.ui.Device.system.phone, // fullscreen solo en móvil
                    contentWidth: "auto",
                    contentHeight: "auto",
                    verticalScrolling: false,
                    horizontalScrolling: false,
                    content: [
                        new sap.m.VBox({
                            alignItems: "Center",
                            justifyContent: "Center",
                            width: "100%",
                            height: "100%",
                            items: [this._fullImageControl]
                        }).addStyleClass("photoViewerContainer")
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        press: function () {
                            this._photoDialog.close();
                        }.bind(this)
                    })
                });

                this.getView().addDependent(this._photoDialog);
            }

            this._fullImageControl.setSrc(sImageSrc);
            this._photoDialog.open();
        },
        onDeleteListItem(oEvent) {
            const oListItem = oEvent.getParameter("listItem");
            const oContext = oListItem.getBindingContext("localModel");
            if (!oContext) return;

            const sPath = oContext.getPath(); // ej.: /aPhoto/2

            const iIndex = parseInt(sPath.split("/").pop(), 10);
            if (!Number.isInteger(iIndex)) return;

            const aPhotos = this.localModel.getProperty("/aPhoto") || [];

            aPhotos.splice(iIndex, 1);

            this.localModel.setProperty("/aPhoto", aPhotos);
        }
    });
});