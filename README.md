# 📸 PhotoUploader – SAPUI5 Custom Control

## 📌 Descripción

`PhotoUploader` es un control personalizado desarrollado en SAPUI5 que permite capturar fotografías directamente desde la cámara del dispositivo (móvil o desktop).

Este repositorio incluye además una **aplicación de prueba** que demuestra el uso del control, permitiendo:

- Tomar fotografías
- Visualizarlas en una lista
- Eliminar fotos
- Ver la imagen en pantalla completa

El control sigue un enfoque **stateless**, delegando completamente la gestión de las imágenes al controlador.

---

## 🎯 Objetivo

Facilitar la captura de imágenes en aplicaciones SAPUI5 de forma:

- Reutilizable
- Desacoplada
- Optimizada para dispositivos móviles
- Fácil de integrar

---

## 🧪 Aplicación de ejemplo

Incluye una app funcional que permite:

- 📷 Capturar fotos  
- 📋 Mostrar fotos en lista  
- ❌ Eliminar fotos  
- 🔍 Ver imagen en detalle  

---

## ⚙️ Características

- Captura de imágenes desde cámara
- Compresión automática (máx. 1024px)
- Base64 (`dataURL`)
- Nombre automático
- Responsive (mobile-first)
- Control stateless
- Manejo de permisos
- Prevención de múltiples capturas
- 🔦 Soporte opcional de flash (torch)

---

## 🔦 Flash (Torch)

El control permite activar el flash del dispositivo cuando es soportado:

- Implementado como `ToggleButton`
- Se muestra solo si:
  - `showTorchButton = true`
  - el dispositivo soporta torch

⚠️ Nota:
- No funciona en todos los dispositivos
- iOS generalmente no lo soporta
- Desktop no tiene soporte

---

## 🧩 Uso

### XML

```xml
<custom:PhotoUploader
    fileNamePrefix="FOTO"
    showTorchButton="true"
    change="onPhotoChange"
/>
```

---

### Controller

```javascript
onPhotoChange(oEvent) {
    const oPhoto = oEvent.getParameter("photo");

    let aPhotos = this.getModel("localModel").getProperty("/aPhoto") || [];
    aPhotos.push(oPhoto);

    this.getModel("localModel").setProperty("/aPhoto", aPhotos);
}
```

---

## 📦 Evento

```javascript
{
  photo: {
    dataURL: string,
    fileName: string
  }
}
```

---

## 🔧 Propiedades

| Propiedad        | Tipo     | Default        | Descripción |
|-----------------|----------|---------------|------------|
| enabled         | boolean  | true          | Activa o desactiva el control |
| fileNamePrefix  | string   | "photo"       | Prefijo del nombre |
| onlyIcon        | boolean  | false         | Solo ícono |
| buttonText      | string   | "Tomar Foto"  | Texto del botón |
| showTorchButton | boolean  | false         | Activa el flash |

---

## 🧠 Arquitectura

El control es stateless:

- No guarda fotos
- No valida límites
- No maneja estado de datos

👉 Todo lo maneja el controller

---

## ⚠️ Consideraciones

- Requiere permisos de cámara
- Puede fallar si el usuario los deniega
- Manejar memoria al usar base64
- El flash no está garantizado

---

## 📱 Compatibilidad

- SAPUI5 / Fiori
- Workzone
- Navegadores modernos
- Android (mejor soporte)
- iOS (limitado)

---

## 🚀 Futuro

- Captura múltiple (batch)
- Preview interno