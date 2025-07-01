
-- Create the companion_unavailable_days table
CREATE TABLE public.companion_unavailable_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  companion_id UUID NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.companion_unavailable_days ENABLE ROW LEVEL SECURITY;

-- Create policies for companion_unavailable_days
CREATE POLICY "Companions can manage their unavailable days" 
  ON public.companion_unavailable_days 
  FOR ALL 
  USING (companion_id IN (
    SELECT companion_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'companion'
  ));

-- Create unique constraint to prevent duplicate unavailable days
CREATE UNIQUE INDEX companion_unavailable_days_unique 
  ON public.companion_unavailable_days (companion_id, date);
