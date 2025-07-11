// FilteredDataTable_Sortable_Final.js
// Complete version with sort tooltips, hover indicators, styled icons, and disclaimer

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { FiLink } from "react-icons/fi";
import "./styles.css";

const requiredHeaders = [
  "title",
  "attachment",
  "contractingEntityName",
  "publicationDate",
  "tenderClosingDate",
  "expectedContractStartDate",
  "contactInfoName",
  "contactInfoEmail",
  "contactInfoPhone",
  "referenceNumber",
  "solicitationNumber",
  "unspsc",
  "unspscDescription",
];

const headerLabels = {
  title: "Title",
  attachment: "Attachments",
  contractingEntityName: "Contracting Entity",
  publicationDate: "Published Date",
  tenderClosingDate: "Closing Date",
  expectedContractStartDate: "Start Date",
  contactInfoName: "Contact Name",
  contactInfoEmail: "Email",
  contactInfoPhone: "Phone",
  referenceNumber: "Reference #",
  solicitationNumber: "Solicitation #",
  unspsc: "UNSPSC",
  unspscDescription: "UNSPSC Description",
};

const simplifyHeader = (header) => header.split("-")[0].split(".")[0].trim();

const extractFilteredData = (csvText) => {
  const parsed = Papa.parse(csvText, { header: true });
  const originalHeaders = parsed.meta.fields || [];
  const simplifiedToOriginal = {};

  originalHeaders.forEach((header) => {
    const simplified = simplifyHeader(header);
    if (!simplifiedToOriginal[simplified]) {
      simplifiedToOriginal[simplified] = header;
    }
  });

  return parsed.data.map((row) => {
    const filteredRow = {};
    requiredHeaders.forEach((key) => {
      const originalKey = simplifiedToOriginal[key];
      filteredRow[key] = row[originalKey] || "";
    });
    return filteredRow;
  });
};

const highlightMatch = (text, keyword) => {
  if (!keyword || typeof text !== "string") return text;
  const regex = new RegExp(`(${keyword})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
};

const renderCellContent = (header, value, searchTerm) => {
  if (header === "attachment") {
    const urls = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http"));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <FiLink /> View File
          </a>
        ))}
      </div>
    );
  }
  if (header === "contactInfoEmail" && value.includes("@")) {
    return <a href={`mailto:${value}`}>{highlightMatch(value, searchTerm)}</a>;
  }
  return highlightMatch(value, searchTerm);
};

const exportToCSV = (rows) => {
  const csv = [requiredHeaders.map((h) => headerLabels[h] || h).join(",")];
  rows.forEach((row) => {
    csv.push(
      requiredHeaders
        .map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`)
        .join(",")
    );
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "filtered_results.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const FilteredDataTable = () => {
  const [data, setData] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  const fetchCSVData = () => {
    fetch(
      "https://corsproxy.io/?https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv"
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((csvText) => {
        const extracted = extractFilteredData(csvText);
        setData(extracted);
        setLastRefreshed(new Date().toLocaleString());
        setError(null);
      })
      .catch((err) => setError(`Could not fetch CSV: ${err.message}`));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    fetchCSVData();
  }, []);

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    const sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const filteredData = sortedData.filter((row) =>
    requiredHeaders.some(
      (header) =>
        typeof row[header] === "string" &&
        row[header].toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const isSortable = (header) =>
    ["title", "contractingEntityName", "publicationDate"].includes(header);
  const getSortClass = (header) =>
    sortConfig.key === header
      ? sortConfig.direction === "ascending"
        ? "sorted-asc"
        : "sorted-desc"
      : "";

  return (
    <div className="container">
      <h2>vincita presents - GOC Open Tender Results</h2>
      <div
        className="search-controls"
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search by keyword..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            padding: "1rem",
            fontSize: "1.1rem",
            flexGrow: 2,
            minWidth: "300px",
          }}
        />
        <button
          onClick={handleClearSearch}
          style={{ padding: "1rem", minWidth: "100px", height: "56px" }}
        >
          Clear
        </button>
        <button
          onClick={() => exportToCSV(filteredData)}
          style={{ padding: "1rem", minWidth: "120px", height: "56px" }}
        >
          Export CSV
        </button>
        <button
          onClick={fetchCSVData}
          style={{ padding: "1rem", minWidth: "100px", height: "56px" }}
        >
          Refresh
        </button>
      </div>
      {lastRefreshed && (
        <div className="timestamp">Last refreshed: {lastRefreshed}</div>
      )}
      {error && <p className="error">Error: {error}</p>}
      {filteredData.length > 0 && (
        <div className="grid-scrollable">
          <div className="grid-container">
            <div className="grid-row header sticky">
              {requiredHeaders.map((header) => (
                <div
                  key={header}
                  className={`grid-cell ${
                    isSortable(header) ? "clickable" : ""
                  } ${getSortClass(header)}`.trim()}
                  title={isSortable(header) ? "Click to sort" : undefined}
                  onClick={() => isSortable(header) && handleSort(header)}
                >
                  <strong>
                    {headerLabels[header] || header}
                    {sortConfig.key === header &&
                      (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                  </strong>
                </div>
              ))}
            </div>
            {filteredData.map((row, idx) => (
              <div className="grid-row" key={idx}>
                {requiredHeaders.map((header) => (
                  <div className="grid-cell" key={header}>
                    {renderCellContent(header, row[header], searchTerm)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="disclaimer-footer">
        <p>
          <strong>vincita © 2025 all rights reserved - Disclaimer:</strong> This
          information is provided on an <em>"as is"</em> basis for informational
          purposes only. While we strive for accuracy, events beyond our control
          may cause this data to not reflect the most current or complete tender
          opportunities. Please consult the official Government of Canada tender
          portal at{" "}
          <a
            href="https://canadabuys.canada.ca/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            CanadaBuys
          </a>{" "}
          for authoritative information.
        </p>
      </div>
    </div>
  );
};

export default FilteredDataTable;
