# 📸 PhotoUploader – SAPUI5 Custom Control

## 📌 Descripción

`PhotoUploader` es un control personalizado desarrollado en SAPUI5 que permite capturar fotografías directamente desde la cámara del dispositivo (móvil o desktop).

El control sigue un enfoque **stateless**, delegando completamente la gestión de las imágenes al controlador que lo consume.

---

## 🎯 Objetivo

Facilitar la captura de imágenes en aplicaciones SAPUI5 de forma:

- Reutilizable
- Desacoplada
- Optimizada para dispositivos móviles
- Fácil de integrar en cualquier vista

---

## ⚙️ Características

- Captura de imágenes usando la cámara del dispositivo
- Compresión automática (máx. 1024px de ancho)
- Generación de imágenes en base64 (`dataURL`)
- Nombre de archivo automático
- Diseño responsive (mobile-first)
- Control desacoplado del modelo de datos
- Manejo de permisos de cámara
- Prevención de múltiples capturas simultáneas

---

## 🧩 Uso básico

### En la vista (XML)

```xml
<custom:PhotoUploader
    id="photoUploader"
    fileNamePrefix="FOTO"
    change="onPhotoChange"
/>
```

---

### En el controller

```javascript
onPhotoChange(oEvent) {
    const oPhoto = oEvent.getParameter("photo");
    if (!oPhoto) return;

    let aPhotos = this.getModel("localModel").getProperty("/aPhoto") || [];

    aPhotos.push(oPhoto);

    this.getModel("localModel").setProperty("/aPhoto", aPhotos);
}
```

---

## 📦 Estructura del evento

El evento `change` retorna:

```javascript
{
  photo: {
    dataURL: string,   // Imagen en base64
    fileName: string   // Nombre generado automáticamente
  }
}
```

---

## 🔧 Propiedades

| Propiedad        | Tipo     | Default        | Descripción |
|-----------------|----------|---------------|------------|
| enabled         | boolean  | true          | Habilita o deshabilita el control |
| fileNamePrefix  | string   | "photo"       | Prefijo del nombre de archivo |
| onlyIcon        | boolean  | false         | Muestra solo ícono |
| buttonText      | string   | "Tomar Foto"  | Texto del botón |

---

## 🧠 Arquitectura

El control es **stateless**, lo que implica:

- No almacena imágenes internamente
- No gestiona listas de fotos
- No valida límites de cantidad

👉 Toda la lógica debe implementarse en el controller.

---

## ⚠️ Consideraciones

- Requiere permisos de cámara (`getUserMedia`)
- Puede fallar si el usuario deniega acceso
- Las imágenes se almacenan en memoria como base64 (cuidado con grandes volúmenes)

---

## 📱 Compatibilidad

- SAPUI5 / Fiori
- SAP Workzone
- Navegadores modernos
- Dispositivos móviles (Android / iOS)

---

## 🚀 Posibles mejoras futuras

- Captura múltiple (batch)
- Preview integrado