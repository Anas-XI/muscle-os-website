import postgres from 'postgres';

export default {
  async fetch(request, env, ctx) {
    const sql = postgres('postgresql://postgres:bvrsuo4nyaf0z0U9@db.kddxpxbstnvmgwdgponc.supabase.co:5432/postgres', {
      ssl: 'require'
    });
    
    try {
      const createRpc = `
        CREATE OR REPLACE FUNCTION exec_sql(query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE query;
        END;
        $$;
      `;
      
      await sql.unsafe(createRpc);
      return new Response('RPC created successfully!');
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};
