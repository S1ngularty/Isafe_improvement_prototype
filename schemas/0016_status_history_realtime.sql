-- Enable realtime for status_history table
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_history;
ALTER TABLE public.status_history REPLICA IDENTITY FULL;
