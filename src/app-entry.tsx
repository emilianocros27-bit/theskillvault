import * as React from "react";
import { createRoot } from "react-dom/client";
import GlassFolder from "./glass-folder.bundle";
(window as any).React = React;
(window as any).ReactDOM = { createRoot };
(window as any).GF = { default: GlassFolder };
