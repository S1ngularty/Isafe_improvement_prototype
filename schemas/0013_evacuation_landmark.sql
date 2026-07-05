ALTER TABLE public.evacuation_areas
ADD COLUMN landmark_url TEXT,
ADD COLUMN deleted_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evacuation_landmarks',
  'evacuation_landmarks',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
