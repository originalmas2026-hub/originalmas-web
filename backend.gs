const ADMIN_ID = "7954252433";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!data.imageBase64) {
      return jsonResponse({ok:false, error:"No se recibió la imagen."});
    }

    const folder = getUploadFolder_();
    const bytes = Utilities.base64Decode(data.imageBase64);
    const blob = Utilities.newBlob(
      bytes,
      data.mimeType || "image/jpeg",
      data.fileName || ("comprobante_" + Date.now() + ".jpg")
    );

    const file = folder.createFile(blob);

    const pedidoId = "OM-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);

    const sheet = getOrdersSheet_();
    sheet.appendRow([
      pedidoId,
      new Date(),
      data.firstName || "",
      data.service || "",
      data.duration || "",
      data.amount || "",
      data.paymentMethod || "",
      file.getId(),
      "PENDIENTE",
      ""
    ]);

    const botToken = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN");
    if (!botToken) {
      throw new Error("Falta configurar BOT_TOKEN en las propiedades del proyecto.");
    }

    const mensaje =
      "💳 NUEVO COMPROBANTE DE PAGO\\n" +
      "━━━━━━━━━━━━━━━━━━━━\\n\\n" +
      "👤 CONTACTO\\n" +
      (data.firstName || "No indicado") + "\\n\\n" +
      "📺 SERVICIO\\n" +
      (data.service || "No indicado") + "\\n\\n" +
      "📅 DURACIÓN\\n" +
      (data.duration || "No indicada") + "\\n\\n" +
      "💰 IMPORTE\\n" +
      (data.amount || "No indicado") + "\\n\\n" +
      "💳 MÉTODO DE PAGO\\n" +
      (data.paymentMethod || "No indicado") + "\\n\\n" +
      "📎 Comprobante guardado en Google Drive.";

    const telegramUrl = "https://api.telegram.org/bot" + botToken + "/sendMessage";

    UrlFetchApp.fetch(telegramUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: ADMIN_ID,
        text: mensaje
      }),
      muteHttpExceptions: true
    });

    return jsonResponse({
      ok: true,
      message: "Comprobante recibido correctamente.",
      fileId: file.getId()
    });

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error.message
    });
  }
}

function getOrdersSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");

  let ss;
  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.create("OriginalMas - Pedidos");
    PropertiesService.getScriptProperties().setProperty("ORDERS_SPREADSHEET_ID", ss.getId());
  }

  let sheet = ss.getSheetByName("Pedidos");
  if (!sheet) {
    sheet = ss.insertSheet("Pedidos");
    sheet.appendRow([
      "ID Pedido",
      "Fecha",
      "Cliente / Contacto",
      "Servicio",
      "Duración",
      "Importe",
      "Método de pago",
      "Comprobante",
      "Estado",
      "Acceso"
    ]);
  }

  return sheet;
}

function getUploadFolder_() {
  const folderId = PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");

  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  const folder = DriveApp.createFolder("OriginalMas - Comprobantes");
  PropertiesService.getScriptProperties().setProperty("DRIVE_FOLDER_ID", folder.getId());
  return folder;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
