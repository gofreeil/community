import { ImageResponse } from '@vercel/og';
import type { RequestHandler } from './$types';
import { satoriRtl, loadLogoBase64 } from '$lib/server/ogCard';

export const GET: RequestHandler = async () => {
    // קרא את הלוגו כ-base64
    const logoBase64 = loadLogoBase64();

    return new ImageResponse(
        {
            type: 'div',
            props: {
                style: {
                    width: '1200px',
                    height: '630px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    fontFamily: 'sans-serif',
                },
                children: [
                    {
                        type: 'img',
                        props: {
                            src: logoBase64,
                            width: 400,
                            height: 400,
                            style: { borderRadius: '50%', marginBottom: '24px', objectFit: 'cover' }
                        }
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '64px',
                                fontWeight: '900',
                                color: '#312e81',
                                marginBottom: '10px',
                                textAlign: 'center',
                                direction: 'rtl',
                            },
                            // satori לא תומך RTL - satoriRtl הופך ידנית כדי שהעברית תצא נכון
                            children: satoriRtl('קהילה בשכונה')
                        }
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '30px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textAlign: 'center',
                                direction: 'rtl',
                                maxWidth: '900px',
                            },
                            children: satoriRtl('כל יתרונות השכונה תחת קורת גג אחת')
                        }
                    }
                ]
            }
        },
        { width: 1200, height: 630 }
    );
};
