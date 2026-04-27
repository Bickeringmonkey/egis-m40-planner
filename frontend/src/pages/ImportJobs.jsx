import { useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";

function ImportJobs() {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      try {
        const res = await api.post("/jobs/import", { jobs: json });

        setMessage(`✅ ${res.data.inserted} jobs imported`);
      } catch (err) {
        console.error(err);

        if (err.response?.data?.details) {
          setMessage(err.response.data.details.join("\n"));
        } else {
          setMessage("Import failed");
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="page">
      <h1>Import Jobs</h1>

      <input type="file" accept=".xlsx, .xls" onChange={handleFile} />

      {fileName && <p>Selected: {fileName}</p>}

      {message && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: "20px" }}>
          {message}
        </pre>
      )}
    </div>
  );
}

export default ImportJobs;