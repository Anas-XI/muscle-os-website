import { Client } from 'pg';

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname !== '/migrate') return new Response('Not Found', { status: 404 });
    
    const client = new Client({
      connectionString: 'postgresql://postgres:bvrsuo4nyaf0z0U9@db.kddxpxbstnvmgwdgponc.supabase.co:5432/postgres'
    });
    
    try {
      await client.connect();
      
      // We will create the exec_sql function so we can run the rest via REST API
      const createRpc = 
        CREATE OR REPLACE FUNCTION exec_sql(query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS \$\$
        BEGIN
          EXECUTE query;
        END;
        \$\$;
      ;
      
      await client.query(createRpc);
      await client.end();
      
      return new Response('RPC created successfully!');
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};
