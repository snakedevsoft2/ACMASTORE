export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/tienda", label: "Tienda" },
  { href: "/tienda?orden=nuevos", label: "Novedades" },
  { href: "/tienda?ofertas=1", label: "Ofertas" },
  { href: "/seguimiento", label: "Seguimiento" },
  { href: "/contacto", label: "Contacto" },
];

/** Enlaces que no aplican cuando la tienda vende solo por WhatsApp. */
export const HIDDEN_IN_WHATSAPP_MODE = ["/tienda?orden=nuevos", "/seguimiento"];
