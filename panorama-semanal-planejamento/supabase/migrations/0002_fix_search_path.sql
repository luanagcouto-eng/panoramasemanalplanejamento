-- Corrige aviso de seguranca "function_search_path_mutable" do linter Supabase
-- fixando o search_path da funcao de trigger update_updated_at.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
