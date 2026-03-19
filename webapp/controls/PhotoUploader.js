sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/Dialog",
    "sap/ui/core/HTML",
    "sap/m/MessageToast",
    "sap/m/library",
    "sap/ui/core/BusyIndicator"
], function (Control, Button, VBox, Dialog, HTML, MessageToast, mobileLibrary, BusyIndicator) {
    "use strict";

    const ButtonType = mobileLibrary.ButtonType;

    return Control.extend("zalopez.onlyfortesting.controls.PhotoUploader", {

        // ======================================================
        // METADATA
        // Define propiedades, eventos y agregaciones del control
        // ======================================================
        metadata: {
            properties: {
                enabled: { type: "boolean", defaultValue: true },
                fileNamePrefix: { type: "string", defaultValue: "photo" },
                onlyIcon: { type: "boolean", defaultValue: false },
                buttonText: { type: "string", defaultValue: "Tomar Foto" }
            },
            events: {
                /**
                 * Evento que se dispara al capturar una foto.
                 * Retorna un objeto con la imagen en base64 y el nombre generado.
                 * - dataURL: imagen en base64
                 * - fileName: nombre generado
                 */
                change: {
                    parameters: {
                        photo: { type: "object" }
                    }
                }
            },
            aggregations: {
                _container: { type: "sap.m.VBox", multiple: false, visibility: "hidden" }
            }
        },

        // ======================================================
        // CICLO DE VIDA
        // ======================================================

        /**
         * Inicializa el control y construye su estructura visual.
         */
        init() {
            this._buildUI();
        },

        /**
         * Libera recursos al destruir el control.
         * Es importante para evitar dejar la cámara activa o diálogos en memoria.
         */
        exit() {
            if (this._videoStream) {
                this._videoStream.getTracks().forEach(function (oTrack) {
                    oTrack.stop();
                });
                this._videoStream = null;
            }

            if (this._cameraDialog) {
                this._cameraDialog.destroy();
                this._cameraDialog = null;
            }
        },

        // ======================================================
        // CONSTRUCCIÓN UI
        // ======================================================

        /**
         * Construye la interfaz base del control.
         * Actualmente consiste en un botón que permite abrir la cámara.
         */
        _buildUI() {
            this._oAddButton = new Button({
                text: this.getOnlyIcon() ? "" : this.getButtonText(),
                tooltip: this.getButtonText(),
                type: ButtonType.Emphasized,
                icon: "sap-icon://camera",
                press: this._openCamera.bind(this)
            });

            const oVBox = new VBox({
                items: [this._oAddButton]
            });

            this.setAggregation("_container", oVBox);
            this._updateAddButtonState();
        },

        /**
         * Renderiza el contenedor interno del control.
         */
        renderer(oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.openEnd();

            oRm.renderControl(oControl.getAggregation("_container"));

            oRm.close("div");
        },

        // ======================================================
        // ESTADO DEL CONTROL
        // ======================================================

        /**
         * Actualiza el estado habilitado del botón según la propiedad enabled.
         */
        _updateAddButtonState() {
            if (!this._oAddButton) {
                return;
            }

            this._oAddButton.setEnabled(this.getEnabled());
        },

        /**
         * Setter de enabled.
         * Permite activar o desactivar la interacción con el control.
         */
        setEnabled(bValue) {
            this.setProperty("enabled", bValue, true);
            this._updateAddButtonState();
            return this;
        },

        // ======================================================
        // CONFIGURACIÓN VISUAL
        // ======================================================

        /**
         * Define si el botón muestra solo ícono o ícono con texto.
         */
        setOnlyIcon(bValue) {
            this.setProperty("onlyIcon", bValue, true);

            if (this._oAddButton) {
                this._oAddButton.setText(bValue ? "" : this.getButtonText());
                this._oAddButton.setTooltip(this.getButtonText());
            }

            return this;
        },

        /**
         * Define el texto del botón.
         * Si el valor es vacío, se utiliza "Tomar Foto".
         */
        setButtonText(sValue) {
            const sFinal = sValue || "Tomar Foto";

            this.setProperty("buttonText", sFinal, true);

            if (this._oAddButton) {
                this._oAddButton.setText(this.getOnlyIcon() ? "" : sFinal);
                this._oAddButton.setTooltip(sFinal);
            }

            return this;
        },

        // ======================================================
        // MANEJO DE CÁMARA
        // ======================================================

        /**
         * Abre el diálogo de cámara.
         * Si aún no existe, lo crea e inicializa su contenido.
         */
        _openCamera() {
            if (!this.getEnabled()) {
                return;
            }

            if (!this._cameraDialog) {
                this._sVideoId = this.getId() + "-cameraVideo";

                this._cameraDialog = new Dialog({
                    title: "Cámara",
                    stretch: true,
                    contentWidth: "100%",
                    contentHeight: "100%",
                    verticalScrolling: false,
                    horizontalScrolling: false,
                    escapeHandler: () => this._closeCamera(),
                    content: [
                        new HTML({
                            content: `
                                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:black;">
                                    <video id="${this._sVideoId}" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                                </div>
                            `
                        })
                    ],
                    beginButton: new Button({
                        text: "Capturar foto",
                        type: ButtonType.Emphasized,
                        icon: "sap-icon://add-photo",
                        press: (oEvent) => {
                            const oBtn = oEvent.getSource();
                            oBtn.setEnabled(false);

                            try {
                                const oImage = this._capture();
                                if (oImage) {
                                    this._emitPhoto(oImage);
                                }
                            } finally {
                                this._closeCamera();
                                oBtn.setEnabled(true);
                            }
                        }
                    }),
                    endButton: new Button({
                        text: "Cerrar",
                        icon: "sap-icon://decline",
                        press: () => this._closeCamera()
                    }),
                    afterOpen: () => this._startCamera()
                });

                this.addDependent(this._cameraDialog);
            }

            this._cameraDialog.open();
        },

        /**
         * Inicia el stream de video del dispositivo.
         * Muestra un indicador de carga y maneja posibles errores de permisos.
         */
        _startCamera() {
            BusyIndicator.show(0);

            const tryStart = () => {
                const video = document.getElementById(this._sVideoId);

                if (!video) {
                    setTimeout(tryStart, 100);
                    return;
                }

                navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                }).then((stream) => {
                    this._videoStream = stream;
                    video.srcObject = stream;
                    BusyIndicator.hide();
                }).catch((err) => {
                    BusyIndicator.hide();

                    if (err.name === "NotAllowedError") {
                        MessageToast.show("Permiso de cámara denegado");
                    } else {
                        MessageToast.show("No se pudo acceder a la cámara");
                    }

                    console.error(err);
                });
            };

            tryStart();
        },

        /**
         * Detiene el stream de video y cierra el diálogo de cámara.
         */
        _closeCamera() {
            if (this._videoStream) {
                this._videoStream.getTracks().forEach(function (oTrack) {
                    oTrack.stop();
                });
                this._videoStream = null;
            }

            if (this._cameraDialog) {
                this._cameraDialog.close();
            }
        },

        // ======================================================
        // CAPTURA DE IMAGEN
        // ======================================================

        /**
         * Captura el frame actual del video, lo redimensiona
         * y lo convierte a base64 para su posterior procesamiento.
         */
        _capture() {
            const video = document.getElementById(this._sVideoId);

            if (!video || !video.videoWidth || !video.videoHeight) {
                MessageToast.show("La cámara aún no está lista");
                return null;
            }

            const canvas = document.createElement("canvas");

            const originalWidth = video.videoWidth;
            const originalHeight = video.videoHeight;

            const MAX_WIDTH = 1024;
            const targetWidth = Math.min(originalWidth, MAX_WIDTH);
            const scale = targetWidth / originalWidth;

            canvas.width = targetWidth;
            canvas.height = Math.round(originalHeight * scale);

            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const QUALITY = 0.7;
            const dataURL = canvas.toDataURL("image/jpeg", QUALITY);

            const sPrefix = this.getFileNamePrefix() || "photo";

            return {
                dataURL,
                fileName: `${sPrefix}_${Date.now()}.jpg`
            };
        },

        // ======================================================
        // EVENTOS
        // ======================================================

        /**
         * Emite el evento change con la foto capturada.
         * El controlador consumidor decide cómo almacenarla o procesarla.
         */
        _emitPhoto(oImage) {
            this.fireChange({ photo: oImage });
        }
    });
});