import { ImageResponse } from '@vercel/og';
import type { RequestHandler } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';

export const GET: RequestHandler = async () => {
    // קרא את הלוגו כ-base64
    let logoBase64 = '';
    try {
        const logoPath = join(process.cwd(), 'static', 'images', 'community-logo1.png');
        const logoBuffer = readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
        logoBase64 = 'https://community-blush.vercel.app/images/community-logo1.png';
    }

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
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                    fontFamily: 'sans-serif',
                },
                children: [
                    {
                        type: 'img',
                        props: {
                            src: logoBase64,
                            width: 220,
                            height: 220,
                            style: { borderRadius: '50%', marginBottom: '32px', objectFit: 'cover' }
                        }
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '80px',
                                fontWeight: '900',
                                color: '#facc15',
                                marginBottom: '16px',
                                textAlign: 'center',
                                direction: 'rtl',
                            },
                            children: 'קהילה בשכונה'
                        }
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '36px',
                                fontWeight: '600',
                                color: '#c7d2fe',
                                textAlign: 'center',
                                direction: 'rtl',
                                maxWidth: '900px',
                            },
                            children: 'כל יתרונות השכונה תחת קורת גג אחת'
                        }
                    }
                ]
            }
        },
        { width: 1200, height: 630 }
    );
};
