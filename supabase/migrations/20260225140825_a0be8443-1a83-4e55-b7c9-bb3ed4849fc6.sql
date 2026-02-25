
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact message
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Only admins can read messages
CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete messages
CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
