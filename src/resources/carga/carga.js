import React from "react";
import ReactDOM from "react-dom/client";
import "./carga.css";
import logoDefault from "./logo.png";

// A simple component that renders a full‑screen loading indicator.
// It is also exported as the default in case someone wants to include it
// directly in JSX, but most code uses the helper functions below which
// dynamically mount/unmount the component from the document body.
export default function Carga({ visible = true, logo = logoDefault, texto = "Cargando", showLogo = false }) {
  if (!visible) return null;

  return (
    <div className="loader-screen">
      <div className="loader-wrapper">

        <div className="loader-rings">
          <span></span>
          <span></span>
          <span></span>
        </div>

        {showLogo && (
          <div className="loader-logo">
            <img src={logo} alt="logo" />
          </div>
        )}

        <div className="loader-text">
          {texto}
          <span className="dots"></span>
        </div>

      </div>
    </div>
  );
}

let _loaderRoot = null;

/**
 * Mounts the loader to the document body if it isn't already visible.
 * Multiple calls are idempotent.
 */
export function mostrarCarga(options = {}) {
  if (_loaderRoot) return; // already shown
  const container = document.createElement("div");
  container.id = "global-loader";
  document.body.appendChild(container);
  _loaderRoot = ReactDOM.createRoot(container);
  _loaderRoot.render(<Carga {...options} />);
}

/**
 * Unmounts and removes the loader previously added by `mostrarCarga`.
 */
export function ocultarCarga() {
  if (!_loaderRoot) return;
  _loaderRoot.unmount();
  const container = document.getElementById("global-loader");
  if (container) container.remove();
  _loaderRoot = null;
}