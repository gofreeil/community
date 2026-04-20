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
                            children: 'קהילה בשכונה'
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
                            children: 'כל יתרונות השכונה תחת קורת גג אחת'
                        }
                    }
                ]
            }
        },
        { width: 1200, height: 630 }
    );
};
