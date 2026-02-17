'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* Default fragment shader (same as Hero) */
const DEFAULT_FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define S smoothstep
#define MN min(R.x,R.y)
float pattern(vec2 uv) {
  float d=.0;
  for (float i=.0; i<3.; i++) {
    uv.x+=sin(T*(1.+i)+uv.y*1.5)*.2;
    d+=.005/abs(uv.x);
  }
  return d;
}
vec3 scene(vec2 uv) {
  vec3 col=vec3(0);
  uv=vec2(atan(uv.x,uv.y)*2./6.28318,-log(length(uv))+T);
  for (float i=.0; i<3.; i++) {
    int k=int(mod(i,3.));
    col[k]+=pattern(uv+i*6./MN);
  }
  return col;
}
void main() {
  vec2 uv=(FC-.5*R)/MN;
  vec3 col=vec3(0);
  float s=12., e=9e-4;
  col+=e/(sin(uv.x*s)*cos(uv.y*s));
  uv.y+=R.x>R.y?.5:.5*(R.y/R.x);
  col+=scene(uv);
  O=vec4(col,1.);
}`;

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);
  const uniTimeRef = useRef<WebGLUniformLocation | null>(null);
  const uniResRef = useRef<WebGLUniformLocation | null>(null);
  const rafRef = useRef<number | null>(null);

  // Compile helpers
  const compileShader = (gl: WebGL2RenderingContext, src: string, type: number) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh) || 'Unknown shader error';
      gl.deleteShader(sh);
      throw new Error(info);
    }
    return sh;
  };

  const createProgram = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
    const v = compileShader(gl, vs, gl.VERTEX_SHADER);
    const f = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog) || 'Program link error';
      gl.deleteProgram(prog);
      throw new Error(info);
    }
    return prog;
  };

  // Init GL
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return;
    glRef.current = gl;

    // Program
    let prog: WebGLProgram;
    try {
      prog = createProgram(gl, VERT_SRC, DEFAULT_FRAG);
    } catch (e) {
      console.error(e);
      return;
    }
    programRef.current = prog;

    // Buffer
    const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buf = gl.createBuffer()!;
    bufRef.current = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    // Attributes/uniforms
    gl.useProgram(prog);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uniTimeRef.current = gl.getUniformLocation(prog, 'time');
    uniResRef.current = gl.getUniformLocation(prog, 'resolution');

    // Clear color
    gl.clearColor(0, 0, 0, 1);

    // Size & DPR
    const fit = () => {
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const W = Math.floor(cssW * dpr);
      const H = Math.floor(cssH * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    fit();
    const onResize = () => fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    window.addEventListener('resize', onResize);

    // RAF
    const loop = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      if (uniResRef.current) gl.uniform2f(uniResRef.current, canvas.width, canvas.height);
      if (uniTimeRef.current) gl.uniform1f(uniTimeRef.current, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Redirect if already logged in
    if (!loading && user) {
      router.push('/');
    }

    // Cleanup
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      {/* Font imports */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap');
      `}</style>

      {/* Shader canvas (full-page background) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block select-none touch-none"
        role="img"
        aria-label="Aurora background"
      />

      {/* ===== LEFT SIDE (3/5) ===== */}
      <div className="relative w-3/5 min-h-screen hidden md:flex flex-col">
        {/* Semi-transparent black overlay */}
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

        {/* Back to Home Link */}
        <Link
          href="/"
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white font-semibold text-lg no-underline transition-opacity hover:opacity-80"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Indie Flower', cursive" }}>back</span>
        </Link>

        {/* Left content */}
        <div className="relative z-10 flex flex-col h-full p-12 pt-24">
          {/* Upper: YouTube Video */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/Fk-hGWWmYnw"
                title="NAILART Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Lower: NAILART oversized text */}
          <div className="pb-12 px-8">
            <h2
              className="text-white font-black leading-none tracking-tight select-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(4rem, 8vw, 10rem)',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
              }}
            >
              NAILART
            </h2>
            <p className="text-white/60 text-xl mt-4 max-w-lg" style={{ fontFamily: "'Indie Flower', cursive" }}>
              Design your perfect nails with AI
            </p>
          </div>
        </div>
      </div>

      {/* ===== RIGHT SIDE (2/5) ===== */}
      <div className="relative w-full md:w-2/5 min-h-screen flex items-center justify-center">
        {/* Dark overlay for right side */}
        <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
        {/* Mobile-only back link */}
        <Link
          href="/"
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white font-semibold text-lg no-underline transition-opacity hover:opacity-80 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Indie Flower', cursive" }}>back</span>
        </Link>

        {/* Subtle gradient border on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-px hidden md:block"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent)' }}
        />

        <div className="relative z-10 w-full max-w-md px-8 md:px-12">
          {/* Auth Card */}
          <div
            className="w-full rounded-2xl bg-gradient-to-b from-white/12 to-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.15),0_20px_60px_rgba(0,0,0,.3)] backdrop-blur-xl backdrop-saturate-[120%] p-10"
            style={{ fontFamily: "'Indie Flower', cursive" }}
          >
            {/* Title */}
            <h1 className="text-white text-center font-bold text-4xl mb-2" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
              Welcome
            </h1>
            <p className="text-white/80 text-center text-lg mb-10" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Sign in to create amazing nail art designs
            </p>

            {/* Google Sign In Button */}
            <button
              className="w-full px-6 py-4 rounded-xl bg-white text-gray-900 font-semibold text-lg shadow-[0_10px_40px_rgba(0,0,0,.25)] transition-all hover:shadow-[0_12px_50px_rgba(0,0,0,.35)] hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-white/60 bg-transparent">Or</span>
              </div>
            </div>

            {/* Footer Text */}
            <p className="text-white/70 text-center text-sm">
              By continuing, you agree to our{' '}
              <a href="#" className="text-white/90 underline hover:text-white">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-white/90 underline hover:text-white">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
