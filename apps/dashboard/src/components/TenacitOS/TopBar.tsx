"use client";

import { Search } from "lucide-react";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { BRANDING } from "@/config/branding";

export function TopBar() {

  return (
    <>
      <div
        className="top-bar"
        style={{
          position: "fixed",
          top: 0,
          left: "68px", // Width of dock
          right: 0,
          height: "48px",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 45,
        }}
      >
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "20px" }}>{BRANDING.agentEmoji}</span>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            {BRANDING.appTitle}
          </h1>
          {/* Version Badge */}
          <div
            style={{
              backgroundColor: "var(--accent-soft)",
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "9px",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "1px",
              }}
            >
              v1.0
            </span>
          </div>
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-3">
          {/* Search Box (placeholder) */}
          <button
            className="flex items-center gap-2 transition-all"
            style={{
              width: "240px",
              height: "32px",
              backgroundColor: "var(--surface-elevated)",
              borderRadius: "6px",
              padding: "0 12px",
            }}
          >
            <Search
              className="flex-shrink-0"
              style={{
                width: "16px",
                height: "16px",
                color: "var(--text-muted)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              Search... ⌘K
            </span>
          </button>

          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* User Area */}
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "14px",
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {BRANDING.ownerUsername.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Name */}
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {BRANDING.ownerUsername}
            </span>
          </div>
        </div>
      </div>

    </>
  );
}
