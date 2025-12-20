import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../lib/supabase';

export function useUploadStatement() {
  const queryClient = useQueryClient();

  const createSignedUrlWithRetry = async (
    path: string,
    attempts = 3,
    delayMs = 500
  ): Promise<string> => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const { data, error } = await supabase.storage
        .from('statements')
        .createSignedUrl(path, 60 * 60);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      if (attempt === attempts) {
        throw error || new Error('Failed to create signed URL for statement');
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }

    throw new Error(' Failed to create signed URL for statement ');
  };

  const notifyBackend = async (payload: {
    import_id: string;
    user_id: string;
    file_url: string;
    source_type: string;
    client_id: string;
    signed_url: string;
     accountant_id: null 
  }) => {
    // Similar to Next.js approach: notify backend but don't fail upload if it fails
    try {
      const response = await fetch('https://statement-classifier-python-2.onrender.com/classifier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend notification failed:', response.status, errorText);
        // Log but don't throw - upload succeeded even if notification fails
        throw new Error(
          `Backend notification failed (${response.status}): ${errorText || 'No response body'}`
        );
      }

      const result = await response.json().catch(() => ({}));
      console.log('Backend notified successfully');
      return result;
    } catch (error: any) {
      // Re-throw to handle in caller
      console.error('Backend notification error:', error);
      throw error;
    }
  };

  return useMutation({
    mutationFn: async ({ userId, fileUri, fileName, fileType }: { userId: string; fileUri: string; fileName: string; fileType: string }) => {
      // Upload file to Supabase Storage
      const fileExt = fileName.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // Read file using expo-file-system legacy API (React Native compatible)
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer for Supabase
      // Convert base64 string to binary string, then to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const fileData = bytes.buffer;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, fileData, {
          contentType: fileType,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
      }

      if (!uploadData?.path) {
        throw new Error('Upload succeeded but no path returned');
      }

      const storagePath = uploadData.path;

      // Get public URL first (always available, works for public buckets)
      const { data: { publicUrl } } = supabase.storage
        .from('statements')
        .getPublicUrl(storagePath);

      // Wait for the upload to fully propagate in Supabase Storage
      // This helps avoid "Object not found" errors when creating signed URLs
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to generate signed URL (preferred, but not required)
      // Similar to Next.js approach: always have a valid URL to send
      let signedUrl = publicUrl; // Default to public URL (works for public buckets)

      try {
        // Wait a bit more and retry signed URL creation
        const { data: signedData, error: signedError } = await supabase.storage
          .from('statements')
          .createSignedUrl(storagePath, 60 * 60);

        if (!signedError && signedData?.signedUrl) {
          signedUrl = signedData.signedUrl;
          console.log('✓ Signed URL created successfully');
        } else {
          // Not a critical error - public URL will work for public buckets
          console.warn('⚠ Using public URL (signed URL unavailable, this is OK for public buckets)');
        }
      } catch (error: any) {
        // Non-critical: continue with public URL  
        console.warn('⚠ Using public URL:', error?.message);
      }

      // Create statement_imports record
      const { data: importRecord, error: dbError } = await supabase
        .from('statement_imports')
        .insert({
          user_id: userId,
          file_url: publicUrl,
          source_type: 'bank_statement',
          status: 'uploaded',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Notify backend (non-blocking - similar to Next.js approach)
      // The upload succeeds even if backend notification fails
      notifyBackend({
        import_id: importRecord.id,
        user_id: userId,
        file_url: publicUrl,
        source_type: 'bank_statement',
        client_id: userId,
        signed_url: signedUrl,
         accountant_id: null 
      }).catch((error) => {
        // Log error but don't fail the upload
        console.error('Backend notification failed (non-blocking):', error);
      });

      // Return immediately - don't wait for backend notification
      return importRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement_imports'] });
    },
  });
}

export function usePickDocument() {
  return async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    return {

      uri: result.assets[0].uri,
      name: result.assets[0].name,
      type: result.assets[0].mimeType || 'application/pdf',

    };
  };
}

