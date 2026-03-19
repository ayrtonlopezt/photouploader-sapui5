sap.ui.define([
    "sap/ui/core/mvc/Controller",
], function (Controller) {
    "use strict";
    return Controller.extend("zadmosa.tomainventariorep.controller.BaseController", {

        /**
         * Función de navegación flexible
         * Soporta:
         *  - Sin parámetros
         *  - Parámetros obligatorios
         *  - Parámetros opcionales mediante query (:?query:)
         *
         * @param {string} sRoute   Nombre de la ruta del manifest.json
         * @param {object} oParams  Parámetros obligatorios
         * @param {object} oQueryParams Parámetros opcionales (query)
         */
        navTo(sRoute, oParams, oQueryParams) {

            let oNavParams = oParams || {};

            // Si hay parámetros opcionales, agregar el objeto ?query
            if (oQueryParams) {
                oNavParams.query = oQueryParams;
            }

            return this.getRouter().navTo(sRoute, oNavParams);
        },

        getRouter() {
            return this.getOwnerComponent().getRouter();
        },

        getModel(sName) {
            return this.getOwnerComponent().getModel(sName);
        },

        setModel(oModel, sName) {
            return this.getOwnerComponent().setModel(oModel, sName);
        },

        getBaseUri() {
            const uri = this.getOwnerComponent()
                .getManifestObject()
                .resolveUri("./")
            return uri == "." ? "./" : uri;
        },

        scrollToTop(oPage) {
            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 0);
            }
        },

        showMessageBox(sType, sMessage, fnCallback) {
            const oTypes = {
                "S": MessageBox.success,
                "E": MessageBox.error,
                "W": MessageBox.warning,
                "I": MessageBox.information
            };

            const fn = oTypes[sType] || MessageBox.information;

            fn(sMessage, {
                actions: [MessageBox.Action.OK],
                onClose: () => {
                    if (fnCallback) {
                        fnCallback(sType);
                    }
                }
            });
        },

        showConfirm(sMessage, sType = "Q") {
            return new Promise((resolve) => {

                const oIcons = {
                    "Q": MessageBox.Icon.QUESTION,     // Pregunta (default)
                    "W": MessageBox.Icon.WARNING,      // Advertencia
                    "E": MessageBox.Icon.ERROR,        // Error
                    "I": MessageBox.Icon.INFORMATION   // Información
                };

                const oTitles = {
                    "Q": "Confirmación",
                    "W": "Advertencia",
                    "E": "Error",
                    "I": "Información"
                };

                MessageBox.show(sMessage, {
                    icon: oIcons[sType] || MessageBox.Icon.QUESTION,
                    title: oTitles[sType] || "Confirm",
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: (sAction) => {
                        resolve(sAction === MessageBox.Action.YES);
                    },
                    dependentOn: this.getView()
                });

            });
        },

        geti18nText(sKey, aArgs) {
            return this.getView()
                .getModel("i18n")
                .getResourceBundle()
                .getText(sKey, aArgs);
        },

        _encodeSharePointString(sInput) {
            // Caracteres problemáticos
            var mForbidden = {
                '"': true,
                "*": true,
                ":": true,
                "<": true,
                ">": true,
                "?": true,
                "/": true,
                "\\": true,
                "|": true
            };

            var s = String(sInput ?? "");

            // Usamos "~" como marcador. Primero lo escapamos para que sea reversible.
            s = s.split("~").join("~~");

            function toHex2(ch) {
                return ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
            }

            var out = "";
            for (var i = 0; i < s.length; i++) {
                var ch = s.charAt(i);
                out += mForbidden[ch] ? ("~" + toHex2(ch)) : ch;
            }

            return out;
        },

        _decodeSharePointString(sEncoded) {
            var mForbidden = {
                '"': true,
                "*": true,
                ":": true,
                "<": true,
                ">": true,
                "?": true,
                "/": true,
                "\\": true,
                "|": true
            };

            var s = String(sEncoded ?? "");

            function fromHex2(hex) {
                return String.fromCharCode(parseInt(hex, 16));
            }

            var out = "";
            for (var i = 0; i < s.length; i++) {
                var ch = s.charAt(i);

                if (ch !== "~") {
                    out += ch;
                    continue;
                }

                // "~~" => "~"
                if (s.charAt(i + 1) === "~") {
                    out += "~";
                    i++;
                    continue;
                }

                // "~HH" => char (si HH válido y pertenece al set prohibido)
                var hex = s.substr(i + 1, 2);
                if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                    var original = fromHex2(hex.toUpperCase());
                    if (mForbidden[original]) {
                        out += original;
                        i += 2;
                        continue;
                    }
                }

                // si no calza, deja "~" literal
                out += "~";
            }

            return out;
        },

        // Convierte cualquier string a un valor seguro para usarlo en un query param de URL
        _encodeUrlParam(sInput) {
            return encodeURIComponent(String(sInput ?? ""));
        },

        // Revierte _encodeUrlParam
        _decodeUrlParam(sEncoded) {
            // try/catch por si viene un string malformado (ej. '%' suelto)
            try {
                return decodeURIComponent(String(sEncoded ?? ""));
            } catch (e) {
                return String(sEncoded ?? "");
            }
        },

        // ── HELPERS OFFLINE ───────────────────────────────────────────────────

        /**
         * Indica si la aplicación está en modo offline.
         * Delega en el método isOffline() del UIComponent raíz.
         * @returns {boolean} true = sin red, false = con red
         */
        isOffline() {
            return this.getOwnerComponent().isOffline();
        },

        /**
         * Maneja la respuesta de un POST OData que puede ser offline.
         * El controlador llama a este método tras recibir la respuesta de
         * ODataService.onPostoDataGeneral(). Retorna true si la operación
         * fue encolada (y el controlador debe detener su flujo normal).
         *
         * Ejemplo:
         *   const oResp = await ODataService.onPostoDataGeneral(...);
         *   if (this.handleOfflinePost(oResp, "Conteo guardado.")) return;
         *   // continuar con la lógica online normal
         *
         * @param {object} oResponse   - Respuesta de onPostoDataGeneral()
         * @param {string} sSuccessMsg - Mensaje a mostrar si fue encolado
         * @returns {boolean} true si fue offline (encolado), false si fue online
         */
        handleOfflinePost(oResponse, sSuccessMsg) {
            if (oResponse && oResponse.__offline === true) {
                const sMsg = sSuccessMsg || this.geti18nText("msg_operationQueued");
                MessageToast.show(sMsg, { duration: 4000 });
                return true;
            }
            return false;
        },

        /**
         * Convierte un dataURL (base64) en ArrayBuffer y encola el archivo
         * en IndexedDB para subirlo a SharePoint al recuperar la red.
         * Se usa en lugar de subir directamente cuando no hay conexión.
         *
         * @param {string} sDataURL   - dataURL de la imagen ("data:image/png;base64,...")
         * @param {string} sFileName  - Nombre del archivo (ej. "foto_1_20260219.png")
         * @param {string} sDriveId   - ID del drive de SharePoint
         * @param {string} sDestPath  - Ruta destino en SharePoint
         * @param {string} [sMimeType="image/png"] - Tipo MIME de la imagen
         * @returns {Promise<string>} - ID de la operación encolada
         */
        async enqueueFileOffline(sDataURL, sFileName, sDriveId, sDestPath, sMimeType) {
            // Extraer la parte base64 del dataURL (eliminar "data:image/xxx;base64,")
            const sBase64 = sDataURL.split(",")[1];
            const sBinaryStr = atob(sBase64);
            const aBytes = new Uint8Array(sBinaryStr.length);
            for (let i = 0; i < sBinaryStr.length; i++) {
                aBytes[i] = sBinaryStr.charCodeAt(i);
            }
            const oBuffer = aBytes.buffer; // ArrayBuffer para IndexedDB

            return OfflineService.enqueueFile({
                driveId: sDriveId,
                destPath: sDestPath,
                fileName: sFileName,
                buffer: oBuffer,
                mimeType: sMimeType || "image/png"
            });
        },

        /**
         * Encola en IndexedDB todas las fotos de hallazgos y sustentos
         * de ConteoGeneralConteoItems para subirlas a SharePoint al recuperar la red.
         *
         * Estructura de rutas (igual que el upload online):
         *   Hallazgo : config.REPUESTOS_INIT_PATH / basePath / Hallazgos / {IdHallazgo}
         *   Sustento : config.REPUESTOS_INIT_PATH / basePath / Hallazgos / {IdHallazgo} / Sustentos / {IdTsust}
         *
         * @param {object} oMat     - Objeto del material seleccionado (con ConteoGeneralConteoItems)
         * @param {string} basePath - Ruta base sin REPUESTOS_INIT_PATH
         *   (ej. "2026/01/ZP01/AL01/01/<matnrEncoded>")
         * @returns {Promise<void>}
         */
        async _enqueueHallazgoYSustentoPhotosOffline(oMat, basePath, sType) {
            let aItems = oMat.ConteoGeneralConteoItems || [];
            // if (sType === "C") {
            //     aItems = oMat.IsoToConteoItems || [];
            // } else if (sType === "R") {
            //     aItems = oMat.CuadreDiferenciasConteoItems || [];
            // }

            for (const oItem of aItems) {
                const sIdHallazgo = oItem?.IdHallazgo;
                if (!sIdHallazgo) { continue; }

                // ── Fotos del Hallazgo ─────────────────────────────────────────
                const aHall = (oItem?.HallPhotos || []).filter(
                    (f) => f.origin === "L" && f.dataURL
                );
                for (const oFoto of aHall) {
                    const sTs = Date.now();
                    const sFileName = oFoto.fileName || `HALL_${sIdHallazgo}_${sTs}.png`;
                    const sDestPath = `${config.REPUESTOS_INIT_PATH}/${basePath}/Hallazgos/${sIdHallazgo}`;
                    /* eslint-disable no-await-in-loop */
                    await this.enqueueFileOffline(
                        oFoto.dataURL,
                        sFileName,
                        config.DRIVE_ID,
                        sDestPath
                    );
                }

                // ── Fotos de Sustentos (por IdTsust) ──────────────────────────
                const oSusMap = oItem?.SusPhotosByTsust || {};
                for (const sIdTsust of Object.keys(oSusMap)) {
                    if (!sIdTsust) { continue; }
                    const aSus = (oSusMap[sIdTsust] || []).filter(
                        (f) => f.origin === "L" && f.dataURL
                    );
                    for (const oFoto of aSus) {
                        const sTs = Date.now();
                        const sFileName = oFoto.fileName ||
                            `SUS_${sIdHallazgo}_${sIdTsust}_${sTs}.png`;
                        const sDestPath =
                            `${config.REPUESTOS_INIT_PATH}/${basePath}` +
                            `/Hallazgos/${sIdHallazgo}/Sustentos/${sIdTsust}`;
                        await this.enqueueFileOffline(
                            oFoto.dataURL,
                            sFileName,
                            config.DRIVE_ID,
                            sDestPath
                        );
                    }
                }
            }
        }

    });
});