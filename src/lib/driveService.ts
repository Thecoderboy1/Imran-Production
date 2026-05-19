import { auth } from './firebase';
import { GoogleAuthProvider, reauthenticateWithPopup, getAuth } from 'firebase/auth';

export class DriveService {
  private static ACCESS_TOKEN_KEY = 'google_drive_access_token';

  static async getAccessToken(): Promise<string | null> {
    // Try to get from session/local storage first
    let token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    
    // If no token or expired (hypothetically), we might need to re-auth or prompt
    // For this simple implementation, we assume if it's there, it might work or we prompt.
    return token;
  }

  static setAccessToken(token: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  static async backupData(data: any): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      const metadata = {
        name: 'imran_production_backup.json',
        mimeType: 'application/json',
      };

      const fileContent = JSON.stringify(data);
      const file = new Blob([fileContent], { type: 'application/json' });

      // First, check if file exists
      const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='imran_production_backup.json' and trashed=false`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const listData = await listResponse.json();
      let fileId = null;
      if (listData.files && listData.files.length > 0) {
        fileId = listData.files[0].id;
      }

      if (fileId) {
        // Update existing file
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: fileContent
        });
      } else {
        // Create new file
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: form
        });
      }

      return true;
    } catch (error) {
      console.error('Drive backup failed:', error);
      return false;
    }
  }
}
