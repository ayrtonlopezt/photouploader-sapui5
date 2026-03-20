sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/Button",
    "sap/m/ToggleButton",
    "sap/m/VBox",
    "sap/m/Dialog",
    "sap/ui/core/HTML",
    "sap/m/MessageToast",
    "sap/m/library",
    "sap/ui/core/BusyIndicator"
], function (Control, Button, ToggleButton, VBox, Dialog, HTML, MessageToast, mobileLibrary, BusyIndicator) {
    "use strict";

    const ButtonType = mobileLibrary.ButtonType;

    return Control.extend("zalopez.onlyfortesting.controls.PhotoUploader", {

        // ======================================================
        // METADATA
        // ======================================================
        metadata: {
            properties: {
                enabled: { type: "boolean", defaultValue: true },
                fileNamePrefix: { type: "string", defaultValue: "photo" },
                onlyIcon: { type: "boolean", defaultValue: false },
                buttonText: { type: "string", defaultValue: "Tomar Foto" },
                showTorchButton: { type: "boolean", defaultValue: false }
            },
            events: {
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
        init() {
            this._bTorchEnabled = false;
            this._bTorchSupported = false;
            this._buildUI();
        },

        exit() {
            if (this._videoStream) {
                this._videoStream.getTracks().forEach(t => t.stop());
                this._videoStream = null;
            }

            if (this._cameraDialog) {
                this._cameraDialog.destroy();
                this._cameraDialog = null;
            }
        },

        // ======================================================
        // UI
        // ======================================================
        _buildUI() {
            this._oAddButton = new Button({
                text: this.getOnlyIcon() ? "" : this.getButtonText(),
                tooltip: this.getButtonText(),
                type: ButtonType.Emphasized,
                icon: "sap-icon://camera",
                press: this._openCamera.bind(this)
            });

            this.setAggregation("_container", new VBox({
                items: [this._oAddButton]
            }));

            this._updateAddButtonState();
        },

        renderer(oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.openEnd();
            oRm.renderControl(oControl.getAggregation("_container"));
            oRm.close("div");
        },

        // ======================================================
        // ESTADO
        // ======================================================
        _updateAddButtonState() {
            if (this._oAddButton) {
                this._oAddButton.setEnabled(this.getEnabled());
            }
        },

        setEnabled(bValue) {
            this.setProperty("enabled", bValue, true);
            this._updateAddButtonState();
            return this;
        },

        // ======================================================
        // CONFIGURACIÓN VISUAL
        // ======================================================
        setOnlyIcon(bValue) {
            this.setProperty("onlyIcon", bValue, true);

            if (this._oAddButton) {
                this._oAddButton.setText(bValue ? "" : this.getButtonText());
                this._oAddButton.setTooltip(this.getButtonText());
            }

            return this;
        },

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
        // CÁMARA
        // ======================================================
        _openCamera() {
            if (!this.getEnabled()) return;

            if (!this._cameraDialog) {

                this._sVideoId = this.getId() + "-cameraVideo";

                const aButtons = [];

                // 🔦 Flash (Toggle)
                this._oTorchButton = new ToggleButton({
                    text: "Flash",
                    icon: "sap-icon://lightbulb",
                    visible: false,
                    enabled: false,
                    press: (oEvent) => this._toggleTorch(oEvent)
                });

                aButtons.push(this._oTorchButton);

                // 📸 Capturar
                this._oCaptureButton = new Button({
                    text: "Capturar",
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
                });

                aButtons.push(this._oCaptureButton);

                // ❌ Cerrar
                this._oCloseButton = new Button({
                    text: "Cerrar",
                    icon: "sap-icon://decline",
                    press: () => this._closeCamera()
                });

                aButtons.push(this._oCloseButton);

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
                    buttons: aButtons,
                    afterOpen: () => this._startCamera()
                });

                this.addDependent(this._cameraDialog);
            }

            this._cameraDialog.open();
        },

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
                }).then(stream => {
                    this._videoStream = stream;
                    video.srcObject = stream;
                    this._evaluateTorchSupport();
                    BusyIndicator.hide();
                }).catch(err => {
                    BusyIndicator.hide();
                    MessageToast.show("No se pudo acceder a la cámara");
                    console.error(err);
                });
            };

            tryStart();
        },

        _closeCamera() {
            if (this._videoStream) {

                try {
                    const track = this._videoStream.getVideoTracks()[0];
                    if (track && this._bTorchEnabled) {
                        track.applyConstraints({ advanced: [{ torch: false }] });
                    }
                } catch (e) { }

                this._videoStream.getTracks().forEach(t => t.stop());
                this._videoStream = null;
            }

            this._bTorchEnabled = false;

            if (this._oTorchButton) {
                this._oTorchButton.setPressed(false);
                this._oTorchButton.setVisible(false);
            }

            if (this._cameraDialog) {
                this._cameraDialog.close();
            }
        },

        // ======================================================
        // TORCH
        // ======================================================
        _evaluateTorchSupport() {
            if (!this._oTorchButton || !this.getShowTorchButton()) return;

            try {
                const track = this._videoStream.getVideoTracks()[0];

                if (!track || !track.getCapabilities) {
                    this._oTorchButton.setVisible(false);
                    return;
                }

                const capabilities = track.getCapabilities();
                const bSupported = !!capabilities.torch;

                this._bTorchSupported = bSupported;

                this._oTorchButton.setVisible(bSupported);
                this._oTorchButton.setEnabled(bSupported);

            } catch (e) {
                this._oTorchButton.setVisible(false);
                console.error(e);
            }
        },

        _toggleTorch(oEvent) {
            try {
                const track = this._videoStream.getVideoTracks()[0];
                const bPressed = oEvent.getSource().getPressed();

                if (!track || !track.getCapabilities || !track.getCapabilities().torch) {
                    MessageToast.show("Flash no soportado");
                    return;
                }

                track.applyConstraints({
                    advanced: [{ torch: bPressed }]
                });

                this._bTorchEnabled = bPressed;

            } catch (err) {
                MessageToast.show("Error al controlar el flash");
                console.error(err);
            }
        },

        // ======================================================
        // CAPTURA
        // ======================================================
        _capture() {
            const video = document.getElementById(this._sVideoId);

            if (!video || !video.videoWidth) {
                MessageToast.show("Cámara no lista");
                return null;
            }

            const canvas = document.createElement("canvas");

            const MAX_WIDTH = 1024;
            const scale = Math.min(video.videoWidth, MAX_WIDTH) / video.videoWidth;

            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            return {
                dataURL: canvas.toDataURL("image/jpeg", 0.7),
                fileName: `${this.getFileNamePrefix()}_${Date.now()}.jpg`
            };
        },

        // ======================================================
        // EVENTO
        // ======================================================
        _emitPhoto(oImage) {
            this.fireChange({ photo: oImage });
        }
    });
});