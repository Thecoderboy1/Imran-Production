import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // API Routes
  app.post("/api/send-notification", async (req, res) => {
    const { type, email: rawEmail, name, projectName, senderName, workspaceName, role } = req.body;
    const email = rawEmail?.trim();

    console.log("Notification Request Received:", { type, email, name, projectName });

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      if (resend) {
        let subject = "";
        let html = "";

        if (type === 'invite') {
          subject = `Join ${workspaceName} on Imran Production`;
          const appUrl = process.env.SHARED_APP_URL || "https://ais-pre-iapjyqzmzgu555nh34hooa-873882748937.asia-southeast1.run.app";
          html = `
            <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background: #f1f5f9;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <h1 style="color: #6366f1; margin-bottom: 24px; font-size: 24px;">Team Invitation</h1>
                <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name || 'there'}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;"><strong>${senderName || 'The Producer'}</strong> has invited you to join their production team <strong>${workspaceName || 'Imran Production'}</strong> as a <strong>${role || 'Team Member'}</strong>.</p>
                <div style="margin: 32px 0;">
                  <a href="${appUrl}" style="background: #6366f1; color: white; padding: 16px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Join Production Team</a>
                </div>
                <p style="font-size: 16px; line-height: 1.6;">To accept this invitation, please log in with your email: <strong>${email}</strong>.</p>
                <div style="margin-top: 32px; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">If you don't have an account yet, sign in with Google using this email.</p>
                </div>
              </div>
            </div>
          `;
        } else if (type === 'project_assigned') {
          subject = `New Project Assigned: ${projectName || 'Untitled Project'}`;
          html = `
            <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background: #f1f5f9;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <h1 style="color: #10b981; margin-bottom: 24px; font-size: 24px;">New Assignment</h1>
                <p style="font-size: 16px; line-height: 1.6;">Hi,</p>
                <p style="font-size: 16px; line-height: 1.6;">You have been assigned a new project: <strong>${projectName || 'Untitled'}</strong> by <strong>${senderName || 'Management'}</strong>.</p>
                <p style="font-size: 16px; line-height: 1.6;">Please log in to your dashboard to view the details and start working.</p>
                <div style="margin-top: 32px; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">Workspace: ${workspaceName || 'Imran Production'}</p>
                </div>
              </div>
            </div>
          `;
        } else {
          return res.status(400).json({ error: "Invalid notification type" });
        }

        if (!subject || !html) {
          return res.status(400).json({ error: "Email content generation failed" });
        }

        const fromEmail = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
        const fromName = process.env.RESEND_FROM_NAME || 'Imran Production';
        
        // Resend trial accounts require exact 'onboarding@resend.dev' as sender
        const finalFrom = fromEmail === 'onboarding@resend.dev' 
          ? 'onboarding@resend.dev' 
          : `${fromName} <${fromEmail}>`;

        const { data, error } = await resend.emails.send({
          from: finalFrom,
          to: email,
          subject: subject,
          html: html
        });

        if (error) {
          const isRestriction = (error.name as string) === 'validation_error' || 
                               (error.name as string) === 'restricted_account' || 
                               (error as any).message?.toLowerCase().includes('verified') ||
                               (error as any).message?.toLowerCase().includes('onboarding') ||
                               (error as any).message?.toLowerCase().includes('trial');

          if (isRestriction) {
            console.warn("Resend Trial Restriction Detected:", error.message);
            return res.status(422).json({ 
              error: "Email Restriction",
              message: "Resend trial accounts only allow sending to your own email address. To send to others, you must verify your domain at resend.com.",
              code: error.name,
              details: error
            });
          }

          console.error("Resend API Error:", JSON.stringify(error, null, 2));
          return res.status(500).json({ error: error.message || "Unknown Resend error" });
        }
        console.log("Email sent successfully:", data?.id);
        res.json({ success: true, id: data?.id });
      } else {
        console.error("Resend client not initialized (check RESEND_API_KEY)");
        res.status(500).json({ error: "Email service not configured. Please add RESEND_API_KEY in project settings." });
      }
    } catch (err: any) {
      console.error("Server catch block error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
