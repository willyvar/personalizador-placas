// script.js (REVISADO) - separación capas: fondo (full o editable) + mascota encima + textos
document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
     Variables & DOM
  ===================================================== */
  let activeSide = "front"; // 'front' o 'back'
  let activeElement = null; // referencia (foto, bgImage o texto) del lado activo
  const templates = { front: null, back: null };

  const state = {
    front: {
      bgColor: "#ffffff",
      bgImage: null, // transformable background (selectable)
      bgFullImage: null, // cover/full background (not selectable)
      photo: null, // mascota
      texts: [],
    },
    back: {
      bgColor: "#ffffff",
      bgImage: null,
      bgFullImage: null,
      photo: null,
      texts: [],
    },
  };
  const canvasFront = document.getElementById("canvasFront");
  const ctxFront = canvasFront.getContext("2d");
  const canvasBack = document.getElementById("canvasBack");
  const ctxBack = canvasBack.getContext("2d"); // Controles

  const templateSelect = document.getElementById("templateSelect");
  const bgInput = document.getElementById("bgInput");
  const bgFullCheckbox = document.getElementById("bgFullCheckbox"); // puede ser undefined si no existe en HTML
  const bgColorInput = document.getElementById("bgColorInput");
  const photoInput = document.getElementById("photoInput");
  const fontSelect = document.getElementById("fontSelect");
  const addTextBtn = document.getElementById("addTextBtn");
  const textInput = document.getElementById("textInput");
  const textColor = document.getElementById("textColor");
  const textSize = document.getElementById("textSize");
  const rotateLeftBtn = document.getElementById("rotateLeftBtn");
  const rotateRightBtn = document.getElementById("rotateRightBtn");
  const rotateRange = document.getElementById("rotateRange");
  const scaleRange = document.getElementById("scaleRange");
  const deleteActiveBtn = document.getElementById("deleteActiveBtn");
  const toggleSideBtn = document.getElementById("toggleSideBtn");
  const resetSideBtn = document.getElementById("resetSideBtn");
  const exportBothBtn = document.getElementById("exportBothBtn");
  const sendEmailBtn = document.getElementById("sendEmailBtn");
  const sendWhatsappBtn = document.getElementById("sendWhatsappBtn");
  const emailInput = document.getElementById("emailInput");
  const whatsappInput = document.getElementById("whatsappInput");
  const statusMsg = document.getElementById("statusMsg");
  const sideBadge = document.getElementById("sideBadge");
  const activeLabel = document.getElementById("activeLabel");

  if (!canvasFront || !canvasBack) {
    console.error("No se encontraron canvases en el DOM.");
    return;
  } /* =====================================================
     Utilidades UI
  ===================================================== */

  function showMessage(msg, type = "info") {
    if (statusMsg) {
      statusMsg.textContent = msg;
      statusMsg.style.color =
        type === "error" ? "red" : type === "success" ? "green" : "#333";
    } else {
      console.log("[status]", msg);
    }
  }

  function updateActiveUI() {
    if (sideBadge)
      sideBadge.textContent = activeSide === "front" ? "Frente" : "Respaldo";
    if (activeLabel)
      activeLabel.textContent = activeElement ? activeElement.type : "Ninguno"; // resaltar canvas activo visualmente

    canvasFront.style.outline =
      activeSide === "front" ? "3px solid rgba(91,33,182,0.15)" : "none";
    canvasBack.style.outline =
      activeSide === "back" ? "3px solid rgba(91,33,182,0.15)" : "none"; // sincronizar sliders / controles con elemento activo

    syncControlsToActive(); // sincronizar checkbox full con el estado del lado activo (bgFullImage)

    if (bgFullCheckbox)
      bgFullCheckbox.checked = !!getState(activeSide).bgFullImage;
  } /* =====================================================
     Templates por defecto
  ===================================================== */

  function loadDefaultTemplates() {
    const imgF = new Image();
    imgF.onload = () => {
      templates.front = imgF;
      render();
    };
    imgF.onerror = () => console.warn("No se cargó templates/C-01.png");
    imgF.src = "templates/C-01.png";

    const imgB = new Image();
    imgB.onload = () => {
      templates.back = imgB;
      render();
    };
    imgB.onerror = () => console.warn("No se cargó templates/C-01-back.png");
    imgB.src = "templates/C-01-back.png";
  } /* =====================================================
     Render (ambos lados)
     - Orden: color -> bgFullImage (cover) -> bgImage (transformable) -> photo -> textos -> plantilla
  ===================================================== */

  function render() {
    ["front", "back"].forEach((side) => {
      const ctx = side === "front" ? ctxFront : ctxBack;
      const cvs = side === "front" ? canvasFront : canvasBack;
      const st = state[side];

      ctx.clearRect(0, 0, cvs.width, cvs.height); // fondo color

      ctx.fillStyle = st.bgColor || "#ffffff";
      ctx.fillRect(0, 0, cvs.width, cvs.height); // fondo FULL ajustado a plantilla (cover fit) - NO transformable, siempre bajo todo

      if (st.bgFullImage) {
        try {
          const img = st.bgFullImage;
          const scale = Math.max(
            cvs.width / img.width,
            cvs.height / img.height
          );
          const newW = img.width * scale;
          const newH = img.height * scale;
          const offsetX = (cvs.width - newW) / 2;
          const offsetY = (cvs.height - newH) / 2;
          ctx.drawImage(img, offsetX, offsetY, newW, newH);
        } catch (e) {
          console.warn("Error draw bgFullImage", e);
        }
      } // bgImage transformable (solo se dibuja si NO existe bgFullImage)

      if (!st.bgFullImage && st.bgImage && st.bgImage.img) {
        const b = st.bgImage;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate((b.rotation * Math.PI) / 180);
        ctx.scale(b.scale, b.scale);
        try {
          ctx.drawImage(b.img, -b.img.width / 2, -b.img.height / 2);
        } catch (e) {
          console.warn("Error draw bgImage element", e);
        }
        ctx.restore();
      } // foto (mascota) -> siempre encima del fondo

      if (st.photo && st.photo.img) {
        const p = st.photo;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(p.scale, p.scale);
        try {
          ctx.drawImage(p.img, -p.img.width / 2, -p.img.height / 2);
        } catch (e) {
          console.warn("Error draw photo", e);
        }
        ctx.restore();
      } // textos (encima de las imágenes)

      st.texts.forEach((t) => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.scale(t.scale, t.scale);
        ctx.fillStyle = t.color || "#000";
        ctx.font = `${t.size || 28}px ${t.fontFamily || "Inter, Arial"}`;
        ctx.textAlign = "center";
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }); // plantilla overlay (siempre arriba de todo)

      if (templates[side]) {
        try {
          ctx.drawImage(templates[side], 0, 0, cvs.width, cvs.height);
        } catch (e) {
          console.warn("Error draw template", e);
        }
      }
    });

    updateActiveUI();
  } /* =====================================================
     Coordenadas del ratón/puntero relativas al canvas
  ===================================================== */

  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
    const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  } /* =====================================================
     Hit test (texto -> foto -> bgImage)
     - bgFullImage NO es seleccionable
  ===================================================== */

  function hitTest(side, x, y) {
    const st = state[side];
    const ctx = side === "front" ? ctxFront : ctxBack; // textos (de arriba hacia abajo)

    for (let i = st.texts.length - 1; i >= 0; i--) {
      const t = st.texts[i];
      const theta = (-t.rotation * Math.PI) / 180;
      const dx = x - t.x;
      const dy = y - t.y;
      const rx = dx * Math.cos(theta) - dy * Math.sin(theta);
      const ry = dx * Math.sin(theta) + dy * Math.cos(theta);

      ctx.save();
      ctx.font = `${t.size}px ${t.fontFamily || "Inter, Arial"}`;
      const textW = ctx.measureText(t.text).width * t.scale;
      ctx.restore();
      const textH = t.size * t.scale;

      if (
        rx >= -textW / 2 &&
        rx <= textW / 2 &&
        ry >= -textH / 2 &&
        ry <= textH / 2
      ) {
        return { element: t, type: "Texto", index: i };
      }
    } // foto (mascota)

    if (st.photo && st.photo.img) {
      const p = st.photo;
      const theta = (-p.rotation * Math.PI) / 180;
      const dx = x - p.x;
      const dy = y - p.y;
      const rx = dx * Math.cos(theta) - dy * Math.sin(theta);
      const ry = dx * Math.sin(theta) + dy * Math.cos(theta);
      const w = p.img.width * p.scale;
      const h = p.img.height * p.scale;
      if (rx >= -w / 2 && rx <= w / 2 && ry >= -h / 2 && ry <= h / 2)
        return { element: p, type: "Foto" };
    } // bgImage (transformable)

    if (st.bgImage && st.bgImage.img) {
      const b = st.bgImage;
      const theta = (-b.rotation * Math.PI) / 180;
      const dx = x - b.x;
      const dy = y - b.y;
      const rx = dx * Math.cos(theta) - dy * Math.sin(theta);
      const ry = dx * Math.sin(theta) + dy * Math.cos(theta);
      const w = b.img.width * b.scale;
      const h = b.img.height * b.scale;
      if (rx >= -w / 2 && rx <= w / 2 && ry >= -h / 2 && ry <= h / 2)
        return { element: b, type: "BgImage" };
    }

    return null;
  } /* =====================================================
     Interacción pointer (solo sobre lado activo)
  ===================================================== */

  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let dragSide = null;

  const pointerStart = {
    startX: 0,
    startY: 0,
    startRotation: 0,
    startScale: 1,
    startDist: 0,
    startAngle: 0,
  };

  function pointerDownHandler(evt, side) {
    if (side !== activeSide) return;
    const canvas = side === "front" ? canvasFront : canvasBack;
    canvas.setPointerCapture && canvas.setPointerCapture(evt.pointerId);
    const pos = getMousePos(canvas, evt);
    const hit = hitTest(side, pos.x, pos.y);
    if (hit) {
      activeElement = hit.element;
      dragOffset.x = pos.x - activeElement.x;
      dragOffset.y = pos.y - activeElement.y;
      pointerStart.startX = pos.x;
      pointerStart.startY = pos.y;
      pointerStart.startRotation = activeElement.rotation ?? 0;
      pointerStart.startScale = activeElement.scale ?? 1;
      pointerStart.startAngle = Math.atan2(
        pos.y - activeElement.y,
        pos.x - activeElement.x
      );
      pointerStart.startDist = Math.hypot(
        pos.x - activeElement.x,
        pos.y - activeElement.y
      );
      dragging = true;
      dragSide = side;
      showMessage(`${hit.type} seleccionado`);
      syncControlsToActive();
    } else {
      activeElement = null;
      showMessage("Ningún elemento seleccionado");
      syncControlsToActive();
    }
    render();
  }

  function pointerMoveHandler(evt, side) {
    if (!dragging || dragSide !== side || !activeElement) return;
    const canvas = side === "front" ? canvasFront : canvasBack;
    const pos = getMousePos(canvas, evt);

    if (evt.ctrlKey) {
      const currentAngle = Math.atan2(
        pos.y - activeElement.y,
        pos.x - activeElement.x
      );
      const delta = currentAngle - pointerStart.startAngle;
      activeElement.rotation =
        (pointerStart.startRotation ?? 0) + (delta * 180) / Math.PI;
      syncControlsToActive();
      render();
      return;
    }

    if (evt.shiftKey) {
      const currentDist = Math.hypot(
        pos.x - activeElement.x,
        pos.y - activeElement.y
      );
      const factor =
        pointerStart.startDist > 0 ? currentDist / pointerStart.startDist : 1;
      activeElement.scale = Math.min(
        5,
        Math.max(0.1, (pointerStart.startScale ?? 1) * factor)
      );
      syncControlsToActive();
      render();
      return;
    }

    activeElement.x = pos.x - dragOffset.x;
    activeElement.y = pos.y - dragOffset.y;
    render();
  }

  function pointerUpHandler(evt, side) {
    if (dragSide === side) {
      dragging = false;
      dragSide = null;
      const canvas = side === "front" ? canvasFront : canvasBack;
      canvas.releasePointerCapture &&
        canvas.releasePointerCapture(evt.pointerId);
    }
  }

  function wheelHandler(evt, side) {
    if (side !== activeSide) return;
    if (!activeElement) return;
    evt.preventDefault();
    const delta = evt.deltaY;
    const factor = delta > 0 ? 0.95 : 1.05;
    activeElement.scale = Math.min(
      5,
      Math.max(0.1, (activeElement.scale || 1) * factor)
    );
    syncControlsToActive();
    render();
  } // attach pointer events

  canvasFront.addEventListener("pointerdown", (e) =>
    pointerDownHandler(e, "front")
  );
  canvasFront.addEventListener("pointermove", (e) =>
    pointerMoveHandler(e, "front")
  );
  canvasFront.addEventListener("pointerup", (e) =>
    pointerUpHandler(e, "front")
  );
  canvasFront.addEventListener("pointercancel", (e) =>
    pointerUpHandler(e, "front")
  );
  canvasFront.addEventListener("wheel", (e) => wheelHandler(e, "front"), {
    passive: false,
  });

  canvasBack.addEventListener("pointerdown", (e) =>
    pointerDownHandler(e, "back")
  );
  canvasBack.addEventListener("pointermove", (e) =>
    pointerMoveHandler(e, "back")
  );
  canvasBack.addEventListener("pointerup", (e) => pointerUpHandler(e, "back"));
  canvasBack.addEventListener("pointercancel", (e) =>
    pointerUpHandler(e, "back")
  );
  canvasBack.addEventListener("wheel", (e) => wheelHandler(e, "back"), {
    passive: false,
  }); /* =====================================================
     Controles (aplican al lado activo)
  ===================================================== */

  if (templateSelect) {
    templateSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      const img = new Image();
      img.onload = () => {
        templates[activeSide] = img;
        showMessage(`Plantilla aplicada a ${activeSide}`);
        render();
      };
      img.onerror = () => showMessage("Error al cargar la plantilla", "error");
      img.src = val;
    });
  } // helper central para asignar fondo (mantiene la semántica)

  function setBackgroundFromImageForSide(side, img, full) {
    const st = getState(side);
    const cvs = getCanvas(side);
    if (full) {
      st.bgFullImage = img; // no tocamos st.photo ni st.texts
      st.bgImage = null; // opcional: si había una bgImage editable la removemos al subir full
      activeElement = null;
    } else {
      const scale = Math.min(cvs.width / img.width, cvs.height / img.height, 1);
      st.bgImage = {
        img,
        x: cvs.width / 2,
        y: cvs.height / 2,
        scale,
        rotation: 0,
        type: "BgImage",
      };
      activeElement = st.bgImage;
    }
  } /* =====================================================
      BACKGROUND (fondo) - Lógica Corregida
      - La imagen de fondo siempre se adapta a la plantilla.
      - No es editable (no se puede arrastrar, rotar, etc.).
 ===================================================== */

  if (bgInput) {
    bgInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        const st = getState(activeSide); // Always apply as a FULL background (cover fit) when uploaded from bgInput
        setBackgroundFromImageForSide(activeSide, img, true);
        showMessage(`Fondo adaptado a plantilla (fijo) en ${activeSide}`);
        render();
      };
      img.src = URL.createObjectURL(file);
      e.target.value = ""; // Allows re-uploading the same file
    });
  } // cambio de color de fondo

  if (bgColorInput) {
    bgColorInput.addEventListener("input", (e) => {
      getState(activeSide).bgColor = e.target.value;
      render();
    });
  } /* =====================================================
      PHOTO (mascota) - SOLO asigna st.photo, NO toca fondos
   /* =====================================================
      PHOTO (mascota) - Lógica Corregida
      - La foto de la mascota siempre se añade como un elemento editable.
      - Nunca se convierte en fondo.
 ===================================================== */

  if (photoInput) {
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        const cvs = getCanvas(activeSide);
        const st = getState(activeSide); // The image is always a new "photo" element.

        const initScale = Math.min(
          1,
          Math.min(cvs.width / img.width, cvs.height / img.height)
        );

        st.photo = {
          img,
          x: cvs.width / 2,
          y: cvs.height / 2,
          scale: initScale || 1,
          rotation: 0,
          type: "Foto",
        };

        activeElement = st.photo;
        showMessage(`Foto de mascota añadida al lado ${activeSide}`);
        render();
      };
      img.src = URL.createObjectURL(file);
      e.target.value = ""; // Allows re-uploading the same file
    });
  } // cambiar bgFullCheckbox -> convertir entre bgImage <-> bgFullImage si corresponde

  bgFullCheckbox?.addEventListener("change", (e) => {
    const st = getState(activeSide);
    if (e.target.checked) {
      // si tenía bgImage transformable, convertimos a full (solo se guarda la img object)
      if (st.bgImage && st.bgImage.img) {
        st.bgFullImage = st.bgImage.img;
        st.bgImage = null;
        activeElement = null;
      }
    } else {
      // si tenía bgFullImage, lo convertimos a bgImage transformable (centered fit)
      if (st.bgFullImage) {
        const img = st.bgFullImage;
        const cvs = getCanvas(activeSide);
        const scale = Math.min(
          cvs.width / img.width,
          cvs.height / img.height,
          1
        );
        st.bgImage = {
          img,
          x: cvs.width / 2,
          y: cvs.height / 2,
          scale,
          rotation: 0,
          type: "BgImage",
        };
        st.bgFullImage = null;
        activeElement = st.bgImage;
      }
    }
    render();
  }); // Nuevo event listener para el selector de fuentes

  if (fontSelect) {
    fontSelect.addEventListener("change", (e) => {
      if (activeElement && activeElement.type === "Texto") {
        activeElement.fontFamily = e.target.value;
        render();
      }
    });
  }

  if (addTextBtn) {
    addTextBtn.addEventListener("click", () => {
      const val = ((textInput && textInput.value) || "").trim();
      if (!val) return showMessage("Escribe un texto primero", "error");
      const st = getState(activeSide);
      const newT = {
        text: val,
        x: getCanvas(activeSide).width / 2,
        y: getCanvas(activeSide).height / 2,
        scale: 1,
        rotation: 0,
        color: (textColor && textColor.value) || "#000",
        size: parseInt((textSize && textSize.value) || "28", 10),
        fontFamily: (fontSelect && fontSelect.value) || "Inter, Arial", // ¡Nuevo!
        type: "Texto",
      };
      st.texts.push(newT);
      activeElement = newT;
      showMessage("Texto añadido");
      render();
    });
  } // rotar / escala / eliminar / toggle / reset

  rotateLeftBtn?.addEventListener("click", () => {
    if (!activeElement) return showMessage("Selecciona un elemento", "error");
    activeElement.rotation = (activeElement.rotation || 0) - 10;
    syncControlsToActive();
    render();
  });
  rotateRightBtn?.addEventListener("click", () => {
    if (!activeElement) return showMessage("Selecciona un elemento", "error");
    activeElement.rotation = (activeElement.rotation || 0) + 10;
    syncControlsToActive();
    render();
  });
  rotateRange?.addEventListener("input", (e) => {
    if (!activeElement) return;
    activeElement.rotation = parseFloat(e.target.value || 0);
    render();
  });
  scaleRange?.addEventListener("input", (e) => {
    if (!activeElement) return;
    activeElement.scale = parseFloat(e.target.value || 1);
    render();
  });

  deleteActiveBtn?.addEventListener("click", () => {
    if (!activeElement) return showMessage("Nada seleccionado", "error");
    const st = getState(activeSide);
    if (activeElement.type === "Foto") st.photo = null;
    else if (activeElement.type === "BgImage") st.bgImage = null;
    else if (activeElement.type === "Texto") {
      st.texts = st.texts.filter((t) => t !== activeElement);
    }
    activeElement = null;
    render();
  });

  toggleSideBtn?.addEventListener("click", () => {
    activeSide = activeSide === "front" ? "back" : "front";
    const st = getState(activeSide);
    activeElement = st.texts.length
      ? st.texts.at(-1)
      : st.photo || st.bgImage || null;
    showMessage(`Editando lado: ${activeSide}`);
    render();
  }); // Reset del lado: limpia bgImage, bgFullImage, photo, textos y color

  resetSideBtn?.addEventListener("click", () => {
    const st = getState(activeSide);
    st.bgImage = null;
    st.bgFullImage = null;
    st.photo = null;
    st.texts = [];
    st.bgColor = "#ffffff";
    activeElement = null;
    render();
    showMessage(`Lado ${activeSide} reiniciado.`);
  });

  exportBothBtn?.addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = "placa-frente.png";
    a.href = canvasFront.toDataURL("image/png");
    a.click();
    setTimeout(() => {
      a.download = "placa-respaldo.png";
      a.href = canvasBack.toDataURL("image/png");
      a.click();
    }, 400);
  }); /* =====================================================
     Envíos (sin cambios en endpoints)
  ===================================================== */

  async function canvasToDataURLSafe(canvas, preferPNG = true) {
    render();
    await new Promise((res) =>
      requestAnimationFrame(() => requestAnimationFrame(res))
    );
    try {
      if (preferPNG) {
        const png = canvas.toDataURL("image/png");
        if (png.length > 7_500_000) return canvas.toDataURL("image/jpeg", 0.85);
        return png;
      } else {
        return canvas.toDataURL("image/jpeg", 0.9);
      }
    } catch (err) {
      console.error("Error al generar DataURL:", err);
      return null;
    }
  }

  sendEmailBtn?.addEventListener("click", async () => {
    const email = ((emailInput && emailInput.value) || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showMessage("❌ Ingresa un correo válido.", "error");
      return;
    }

    const frontData = await canvasToDataURLSafe(canvasFront, true);
    const backData = await canvasToDataURLSafe(canvasBack, true);
    if (!frontData || !backData) {
      showMessage("❌ Error al generar imágenes.", "error");
      return;
    }

    try {
      const resp = await axios.post(
        "/send-email",
        { email, frontData, backData },
        { timeout: 60000 }
      );
      if (resp.data?.success)
        showMessage("✅ Placa enviada por correo.", "success");
      else {
        console.warn(resp.data);
        showMessage("⚠️ Problema al enviar correo.", "error");
      }
    } catch (err) {
      console.error("Error en /send-email.",err);
    }
  });

  sendWhatsappBtn?.addEventListener("click", async () => {
    let whatsapp = ((whatsappInput && whatsappInput.value) || "").trim();
    if (!whatsapp)
      return showMessage("❌ Ingresa un número de WhatsApp válido.", "error");
    if (!whatsapp.startsWith("57")) whatsapp = "57" + whatsapp;
    const frontData = await canvasToDataURLSafe(canvasFront, true);
    const backData = await canvasToDataURLSafe(canvasBack, true);
    if (!frontData || !backData)
      return showMessage("❌ Error al generar imágenes.", "error");
    try {
      const resp = await axios.post(
        "/send-whatsapp",
        { whatsapp, frontData, backData },
        { timeout: 60000 }
      );
      if (resp.data?.success)
        showMessage("✅ Placa enviada por WhatsApp.", "success");
      else showMessage("⚠️ Problema al enviar WhatsApp.", "error");
    } catch (err) {
      console.error("Error en /send-whatsapp:", err);
    }
  });
  
  /* =====================================================
     Helpers: sincronizar sliders con el elemento activo
  ===================================================== */

  function syncControlsToActive() {
    if (!rotateRange || !scaleRange) return;
    if (activeElement) {
      rotateRange.value = activeElement.rotation ?? 0;
      scaleRange.value = activeElement.scale ?? 1; // Sincronizar selectores de texto

      if (activeElement.type === "Texto") {
        textInput.value = activeElement.text;
        textColor.value = activeElement.color;
        textSize.value = activeElement.size;
        fontSelect.value = activeElement.fontFamily || "Inter, Arial"; // ¡Nuevo!
      } else {
        // Limpiar/desactivar controles de texto
        textInput.value = "";
        textColor.value = "#000000";
        textSize.value = "28";
        fontSelect.value = "Inter, Arial"; // Resetear a la fuente por defecto
      }
    } else {
      rotateRange.value = 0;
      scaleRange.value = 1;
      textInput.value = "";
      textColor.value = "#000000";
      textSize.value = "28";
      fontSelect.value = "Inter, Arial"; // Resetear a la fuente por defecto
    }
  } /* =====================================================
     Helpers pequeños
  ===================================================== */

  function getState(side) {
    return side === "front" ? state.front : state.back;
  }
  function getCanvas(side) {
    return side === "front" ? canvasFront : canvasBack;
  }

  /* =====================================================
   Envío por Correo y WhatsApp
===================================================== */

  // 📧 Enviar correo
  async function enviarCorreo(email, frontDataUrl, backDataUrl) {
    if (!email) {
      alert("❌ Ingresa un correo válido.");
      return;
    }
    try {
      const res = await fetch("/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, frontDataUrl, backDataUrl }),
      });
      const data = await res.json();
      alert(
        data.success
          ? "✅ Correo enviado correctamente"
          : "❌ Error: " + data.error
      );
    } catch (err) {
      alert("❌ Error de conexión al servidor.");
    }
  }

  // 📲 Enviar WhatsApp
  async function enviarWhatsApp(whatsapp, frontDataUrl, backDataUrl) {
    if (!whatsapp) {
      alert("❌ Ingresa un número de WhatsApp válido (ej: 573214874523).");
      return;
    }
    try {
      const res = await fetch("/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp, frontDataUrl, backDataUrl }),
      });
      const data = await res.json();
      alert(
        data.success
          ? "✅ WhatsApp enviado correctamente"
          : "❌ Error: " + data.error
      );
    } catch (err) {
      alert("❌ Error de conexión al servidor.");
    }
  }

  // =====================================================
  // Eventos de los botones
  // =====================================================
  document.getElementById("sendEmailBtn").addEventListener("click", () => {
    const email = document.getElementById("emailInput").value.trim();
    const frontDataUrl = document
      .getElementById("canvasFront")
      .toDataURL("image/png");
    const backDataUrl = document
      .getElementById("canvasBack")
      .toDataURL("image/png");
    enviarCorreo(email, frontDataUrl, backDataUrl);
  });

  document.getElementById("sendWhatsappBtn").addEventListener("click", () => {
    const whatsapp = document.getElementById("whatsappInput").value.trim();
    const frontDataUrl = document
      .getElementById("canvasFront")
      .toDataURL("image/png");
    const backDataUrl = document
      .getElementById("canvasBack")
      .toDataURL("image/png");
    enviarWhatsApp(whatsapp, frontDataUrl, backDataUrl);
  });

  /* =====================================================
     Inicialización
  ===================================================== */

  loadDefaultTemplates();
  render();
  updateActiveUI(); // debug quick logs

  console.log("Script inicializado. Lado activo:", activeSide);
});
