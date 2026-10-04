const ADMIN_ID = "7954252433";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "trialRequest") {
      return handleTrialRequest_(data);
    }

    if (!data.imageBase64) {
      return jsonResponse({ok:false, error:"No se recibió la imagen."});
    }
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
      "",
      data.originalAmount || "",
      data.discountName || "",
      data.discountType || "",
      data.discountValue || "",
      data.finalAmount || ""
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


function handleTrialRequest_(data) {
  const service = String(data.trialService || "").trim();
  const duration = String(data.trialDuration || "").trim();
  const contact = String(data.contact || "").trim();

  if (!service || !duration || !contact) {
    return jsonResponse({ok:false, error:"Faltan datos para solicitar la prueba."});
  }

  const ss = getOrdersSpreadsheet_();
  let sheet = ss.getSheetByName("Pruebas");
  if (!sheet) {
    sheet = ss.insertSheet("Pruebas");
    sheet.appendRow([
      "ID Prueba",
      "Fecha",
      "Cliente / Contacto",
      "Servicio",
      "Duración",
      "Estado",
      "Acceso",
      "Notas"
    ]);
  }

  const pruebaId = "PR-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);

  sheet.appendRow([
    pruebaId,
    new Date(),
    contact,
    service,
    duration,
    "PENDIENTE",
    "",
    ""
  ]);

  const botToken = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN");
  if (botToken) {
    const mensaje =
      "🎁 NUEVA SOLICITUD DE PRUEBA\\n" +
      "━━━━━━━━━━━━━━━━━━━━\\n\\n" +
      "🆔 " + pruebaId + "\\n\\n" +
      "👤 CONTACTO\\n" + contact + "\\n\\n" +
      "📺 SERVICIO\\n" + service + "\\n\\n" +
      "⏱ DURACIÓN\\n" + duration;

    UrlFetchApp.fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({chat_id: ADMIN_ID, text: mensaje}),
      muteHttpExceptions: true
    });
  }

  return jsonResponse({
    ok:true,
    message:"Solicitud de prueba recibida correctamente.",
    trialId:pruebaId
  });
}

function getOrdersSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  const ss = SpreadsheetApp.create("OriginalMas - Pedidos");
  PropertiesService.getScriptProperties().setProperty("ORDERS_SPREADSHEET_ID", ss.getId());
  return ss;
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
      "Acceso",
      "Precio original",
      "Promoción",
      "Tipo descuento",
      "Valor descuento",
      "Precio final"
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


function loginAdmin(password) {
  const saved = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!saved || password !== saved) return {ok:false, error:"Contraseña incorrecta."};
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("ADMIN_SESSION_" + token, "1", 21600);
  return {ok:true, token:token};
}

function isAdminSession_(token) {
  return !!token && CacheService.getScriptCache().get("ADMIN_SESSION_" + token) === "1";
}

function listOrders(token) {
  if (!isAdminSession_(token)) return {ok:false, error:"Sesión no válida."};
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");
  if (!spreadsheetId) return {ok:true, orders:[]};
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Pedidos");
  if (!sheet) return {ok:true, orders:[]};
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {ok:true, orders:[]};
  return {
    ok:true,
    orders:values.slice(1).map(function(row) {
      return {
        id: row[0],
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") : String(row[1] || ""),
        contact: row[2],
        service: row[3],
        duration: row[4],
        amount: row[5],
        paymentMethod: row[6],
        proofId: row[7],
        status: row[8],
        access: row[9],
        originalAmount: row[10],
        discountName: row[11],
        discountType: row[12],
        discountValue: row[13],
        finalAmount: row[14]
      };
    })
  };
}


function listTrials(token) {
  if (!isAdminSession_(token)) return {ok:false, error:"Sesión no válida."};

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");
  if (!spreadsheetId) return {ok:true, trials:[]};

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Pruebas");
  if (!sheet) return {ok:true, trials:[]};

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {ok:true, trials:[]};

  return {
    ok:true,
    trials:values.slice(1).map(function(row) {
      return {
        id: row[0],
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") : String(row[1] || ""),
        contact: row[2],
        service: row[3],
        duration: row[4],
        status: row[5],
        access: row[6],
        notes: row[7]
      };
    })
  };
}

function updateTrial(token, trialId, status, access) {
  if (!isAdminSession_(token)) return {ok:false, error:"Sesión no válida."};

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");
  if (!spreadsheetId) return {ok:false, error:"No existe la hoja de pedidos."};

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Pruebas");
  if (!sheet) return {ok:false, error:"No existe la hoja de pruebas."};

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(trialId)) {
      sheet.getRange(i + 1, 6).setValue(status || values[i][5]);
      sheet.getRange(i + 1, 7).setValue(access || "");
      return {ok:true};
    }
  }

  return {ok:false, error:"Solicitud de prueba no encontrada."};
}

function updateOrder(token, orderId, status, access) {
  if (!isAdminSession_(token)) return {ok:false, error:"Sesión no válida."};
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ORDERS_SPREADSHEET_ID");
  if (!spreadsheetId) return {ok:false, error:"No existe la hoja de pedidos."};
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName("Pedidos");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(orderId)) {
      sheet.getRange(i + 1, 9).setValue(status || values[i][8]);
      sheet.getRange(i + 1, 10).setValue(access || "");
      return {ok:true};
    }
  }
  return {ok:false, error:"Pedido no encontrado."};
}
