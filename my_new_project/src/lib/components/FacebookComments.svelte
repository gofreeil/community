<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    export let url = '';
    export let numPosts = 5;
    export let width = '100%';

    onMount(() => {
        if (browser) {
            // טעינת Facebook SDK
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s) as HTMLScriptElement;
                js.id = id;
                js.src = 'https://connect.facebook.net/he_IL/sdk.js#xfbml=1&version=v18.0';
                fjs.parentNode?.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }
    });
</script>

<div id="fb-root"></div>

<div class="facebook-comments-wrapper">
    <div 
        class="fb-comments" 
        data-href={url || (browser ? window.location.href : '')}
        data-width={width}
        data-numposts={numPosts}
        data-colorscheme="dark"
    ></div>
</div>

<style>
    .facebook-comments-wrapper {
        width: 100%;
        margin: 2rem 0;
    }
</style>
