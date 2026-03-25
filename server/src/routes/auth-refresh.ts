import type { Request, Response, Router } from "express";
import { type Db } from "@paperclipai/db";
import express from "express";
import type { BetterAuthInstance } from "../auth/better-auth.js";

interface AuthRefreshRoutesOptions {
  db: Db;
  auth: BetterAuthInstance; // BetterAuth instance to get access to the API methods
}

export function authRefreshRoutes({ db, auth }: AuthRefreshRoutesOptions): Router {
  const router = express.Router();

  /** 
   * Refresh access token using refresh token
   */
  router.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, value.toString());
          }
        }
      });

      const result = await auth.api.getSession?.({
        headers,
      });

      if (result?.session) {
        res.status(200).json({
          success: true,
          session: result.session,
          user: result.user,
          message: "Session validated successfully"
        });
      } else {
        res.status(401).json({
          error: "Unable to refresh - session not found or refresh token invalid",
        });
      }
    } catch (error) {
      console.error("Refresh token request error:", error);
      res.status(500).json({
        error: "Failed to refresh token",
      });
    }
  });

  /**
   * Logout - Remove session and refresh token
   */
  router.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, value.toString());
          }
        }
      });

      // Call the better-auth signOut API to revoke session
      const result = await auth.api.signOut?.({
        headers,
      });

      res.status(200).json({
        success: true,
        message: "Successfully logged out",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Failed to process logout",
      });
    }
  });

  return router;
}