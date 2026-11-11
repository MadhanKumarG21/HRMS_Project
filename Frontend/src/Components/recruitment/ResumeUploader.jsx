import { useState, useRef } from "react";

const ACCEPTED = [".pdf", ".docx"];
const MAX_FILES = 50;
const MAX_MB = 25;

export default function ResumeUploader({ files, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (incoming) => {
    const valid = [...incoming].filter((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      const size = f.size / (1024 * 1024);
      return ACCEPTED.includes(`.${ext}`) && size <= MAX_MB;
    });
    const merged = [...files];
    valid.forEach((f) => {
      if (!merged.find((e) => e.name === f.name)) merged.push(f);
    });
    onChange(merged.slice(0, MAX_FILES));
  };

  const removeFile = (name) => onChange(files.filter((f) => f.name !== name));

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="ru-wrap">
      {/* Drop zone */}
      <div
        className={`ru-dropzone ${dragging ? "ru-dragging" : ""}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="material-symbols-outlined ru-drop-icon">
          upload_file
        </span>
        <p className="ru-drop-title">Drag & drop resumes here</p>
        <p className="ru-drop-sub">
          PDF or DOCX · max 25 MB each · up to 50 files
        </p>
        <button type="button" className="ru-browse-btn">
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="ru-file-list">
          <div className="ru-file-list-header">
            <span>
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              className="ru-clear-all"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
          {files.map((f) => {
            const ext = f.name.split(".").pop().toUpperCase();
            const size = (f.size / (1024 * 1024)).toFixed(2);
            return (
              <div key={f.name} className="ru-file-row">
                <span
                  className={`ru-file-ext ${ext === "PDF" ? "pdf" : "docx"}`}
                >
                  {ext}
                </span>
                <div className="ru-file-info">
                  <p className="ru-file-name">{f.name}</p>
                  <p className="ru-file-size">{size} MB</p>
                </div>
                <button
                  type="button"
                  className="ru-remove-btn"
                  onClick={() => removeFile(f.name)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
