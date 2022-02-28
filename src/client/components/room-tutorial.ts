const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    div {
      color: black;
    }
    pre {
      color: darkred;
    }
  </style>
  <h3>Usage</h3>
  <code>
    <pre>
  export MOB_TIMER_URL=${window.origin}/
  export MOB_TIMER_ROOM=${window.location.pathname.substring(1)}

  mob start 10
  mob timer 10
  mob break 5
  </pre>
  </code>
`;
export class RoomTutorial extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("room-tutorial", RoomTutorial);
