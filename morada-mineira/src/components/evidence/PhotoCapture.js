"use client";

import { useRef, useState } from "react";
import { compressImage, fileToBase64 } from "@/lib/imageUtils";

export default function PhotoCapture({ onCapture, taskId }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [imageBlob, setImageBlob] = useState(null); // Novo estado para o arquivo real
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.7 });
      const base64 = await fileToBase64(compressed);
      
      setPreview(base64); // Usado apenas para mostrar a miniatura na tela
      setImageBlob(compressed); // Guardando o arquivo real para enviar pro Supabase
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!preview || !imageBlob) return;
    
    onCapture({
      file: imageBlob, // Enviando o arquivo em vez do texto Base64
      description,
      task_id: taskId,
      status: "pendente",
      captured_at: new Date().toISOString(),
    });
    
    setPreview(null);
    setImageBlob(null);
    setDescription("");
  }

  function handleRemovePreview() {
    setPreview(null);
    setImageBlob(null);
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="animate-fade">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {!preview ? (
        <div className="photo-capture" onClick={() => fileInputRef.current?.click()}>
          {loading ? (
            <>
              <div className="photo-capture-icon">⏳</div>
              <div className="photo-capture-text">Processando imagem...</div>
            </>
          ) : (
            <>
              <div className="photo-capture-icon">📸</div>
              <div className="photo-capture-text">
                Toque para tirar foto ou selecionar da galeria
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="photo-preview">
            <img src={preview} alt="Preview da evidência" />
            <button className="photo-preview-remove" onClick={handleRemovePreview}>✕</button>
          </div>

          <div className="input-group" style={{ marginTop: 12 }}>
            <label>Descrição da evidência</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que a foto mostra..."
              rows={2}
            />
          </div>

          <button className="btn btn-success w-full" style={{ marginTop: 12 }} onClick={handleSubmit}>
            ✅ Enviar Evidência
          </button>
        </div>
      )}
    </div>
  );
}