import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface SubmitFeedbackPayload {
  userId: string;
  feedback: string;
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async ({ userId, feedback }: SubmitFeedbackPayload) => {
      const { data, error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: userId,
            feedback_text: feedback,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        throw new Error(error.message || 'Failed to submit feedback');
      }

      return data;
    },
  });
}

