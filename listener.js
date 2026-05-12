const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function startListener() {

    await client.connect();

    console.log('🎧 Escutando PostgreSQL');

//_______________ Escuta o canal___________________

    await client.query(
        'LISTEN img_product_deleted'
    );

    //_______________ Recebe eventos___________________
    
    client.on('notification', (msg) => {

        console.log('📨 Evento recebido');

        console.log('Canal:', msg.channel);
        
        const data = JSON.parse(msg.payload);

        // console.log(data);

    });

//_______________ DELETAR DO SERVIDOR___________________
     client.on('notification', async (msg) => {

    const data = JSON.parse(msg.payload);

     fs.unlink(
         `public${data.url}`,
         (err) => {

             if (err) {
                 console.log(err);
             }

             console.log('🗑️ Imagem removida');
         }
     );

 });

}


startListener();


/**
 * _________________First____________________________
CREATE OR REPLACE FUNCTION img_product_image_deleted()

RETURNS TRIGGER AS $$

BEGIN

    PERFORM pg_notify(

        'product_image_deleted',

        json_build_object(

            'id', OLD.id,
            'url', OLD.url,
            'produto_id', OLD.product_id,
            'acao', 'DELETE'

        )::text
    );

    RETURN OLD;

END;
$$ LANGUAGE plpgsql;

 _________________Second____________________________

 CREATE TRIGGER trigger_img_product_image_deleted

AFTER DELETE
ON product_images

FOR EACH ROW

EXECUTE FUNCTION img_product_image_deleted();
 */