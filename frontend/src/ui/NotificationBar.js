/**
 * NotificationBar – toast notifications for tx status.
 */
export class NotificationBar {
  constructor() {
    let container = document.getElementById("notif-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "notif-container";
      document.body.appendChild(container);
    }
    this.container = container;
  }

  info(msg)    { this._show(msg, "notif-info");    }
  success(msg) { this._show(msg, "notif-success"); }
  warn(msg)    { this._show(msg, "notif-warn");    }
  error(msg)   { this._show(msg, "notif-error");   }

  _show(msg, cls) {
    const el = document.createElement("div");
    el.className = `notif ${cls}`;
    el.textContent = msg;
    this.container.appendChild(el);

    // Fade in
    requestAnimationFrame(() => el.classList.add("visible"));

    // Auto-remove after 4s
    setTimeout(() => {
      el.classList.remove("visible");
      setTimeout(() => el.remove(), 400);
    }, 4000);
  }
}
