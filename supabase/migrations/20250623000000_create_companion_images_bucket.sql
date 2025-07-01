
-- Create storage bucket for companion images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'companion-images',
  'companion-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Set up RLS policies for the storage bucket
CREATE POLICY "Anyone can view companion images" ON storage.objects
  FOR SELECT USING (bucket_id = 'companion-images');

CREATE POLICY "Authenticated users can upload companion images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'companion-images');

CREATE POLICY "Authenticated users can update companion images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'companion-images');

CREATE POLICY "Authenticated users can delete companion images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'companion-images');
