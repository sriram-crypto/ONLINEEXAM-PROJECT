/* eslint-disable no-nested-ternary */
/**
=========================================================
* SAHASRAPATH MUI - v3.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/argon-dashboard-material-ui
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/
function item(theme, ownerState) {
  const { palette, transitions, breakpoints, boxShadows, borders, functions } = theme;
  const { active, darkSidenav, sidenavColor, miniSidenav } = ownerState;

  const { dark, info, success, text, transparent, white } = palette;
  const { xxl } = boxShadows;
  const { borderRadius } = borders;
  const { pxToRem, rgba } = functions;
  const accent = palette[sidenavColor ?? "info"]?.main || info.main;
  const accentSoft = success?.main || "#2dce89";

  return {
    background: active
      ? `linear-gradient(135deg, ${rgba(accent, 0.98)}, ${rgba(accentSoft, 0.94)})`
      : transparent.main,
    color: () => {
      let result = text.main;

      if ((active && sidenavColor) || (active && darkSidenav) || darkSidenav) {
        result = white.main;
      } else if (active) {
        result = dark.main;
      }

      return result;
    },
    display: miniSidenav ? "block" : "flex",
    alignItems: "center",
    width: "100%",
    padding: `${pxToRem(10.8)} ${pxToRem(16)} ${pxToRem(10.8)} ${pxToRem(16)}`,
    margin: `0 ${pxToRem(8)}`,
    borderRadius: borderRadius.md,
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    userSelect: "none",
    whiteSpace: "nowrap",
    boxShadow: active ? `0 14px 32px ${rgba(accent, 0.22)}` : "none",
    transition: transitions.create(["background", "box-shadow", "transform"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.shorter,
    }),

    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      opacity: active ? 1 : 0,
      background:
        "linear-gradient(120deg, transparent 0 32%, rgba(255, 255, 255, 0.32) 46%, transparent 60% 100%), radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.22), transparent 34%)",
      animation: active ? "sidenavActiveSweep 3.2s ease-in-out infinite" : "none",
    },

    "& > *": {
      position: "relative",
      zIndex: 1,
    },

    "@keyframes sidenavActiveSweep": {
      "0%, 100%": { transform: "translateX(-70%)", opacity: 0.45 },
      "50%": { transform: "translateX(70%)", opacity: 0.95 },
    },

    "@media (prefers-reduced-motion: reduce)": {
      "&::before": {
        animation: "none",
      },
    },

    [breakpoints.up("xl")]: {
      boxShadow: () => {
        if (active) {
          return darkSidenav ? xxl : `0 14px 32px ${rgba(accent, 0.22)}`;
        }

        return "none";
      },
      transition: transitions.create(["box-shadow", "transform", "background"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.shorter,
      }),
    },
  };
}

function itemIconBox(theme, ownerState) {
  const { transitions, borders, functions } = theme;
  const { darkSidenav, sidenavColor, active } = ownerState;

  const { borderRadius } = borders;
  const { pxToRem } = functions;

  return {
    color: "inherit",
    minWidth: pxToRem(32),
    minHeight: pxToRem(32),
    borderRadius: borderRadius.md,
    display: "grid",
    placeItems: "center",
    transition: transitions.create("margin", {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    "& svg, svg g": {
      fill: "currentColor",
    },

    "& i": {
      color: active && (darkSidenav || sidenavColor) ? "inherit" : null,
    },
  };
}

const itemIcon = ({ palette: { white, gradients } }, { active }) => ({
  color: active ? white.main : gradients.dark.state,
});

function itemText(theme, ownerState) {
  const { typography, transitions, breakpoints, functions } = theme;
  const { miniSidenav, active } = ownerState;

  const { size, fontWeightMedium, fontWeightRegular } = typography;
  const { pxToRem } = functions;

  return {
    color: "inherit",
    marginLeft: pxToRem(4),

    [breakpoints.up("xl")]: {
      opacity: miniSidenav ? 0 : 1,
      maxWidth: miniSidenav ? 0 : "100%",
      marginLeft: miniSidenav ? 0 : pxToRem(4),
      transition: transitions.create(["opacity", "margin"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.standard,
      }),
    },

    "& span": {
      color: "inherit",
      fontWeight: active ? fontWeightMedium : fontWeightRegular,
      fontSize: size.sm,
      lineHeight: 0,
    },
  };
}

export { item, itemIconBox, itemIcon, itemText };
