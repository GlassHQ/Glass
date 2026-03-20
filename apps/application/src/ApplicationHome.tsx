'use client'

import { useState } from 'react'
import reactLogo from './assets/react.svg'
import heroImg from './assets/hero.png'
import './App.css'

function fileSrc(mod: string | { src: string }): string {
  return typeof mod === 'string' ? mod : mod.src
}

export default function ApplicationHome() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img
            src={fileSrc(heroImg)}
            className="base"
            width={170}
            height={179}
            alt=""
          />
          <img
            src={fileSrc(reactLogo)}
            className="framework"
            alt="React logo"
          />
        </div>
        <div>
          <h1>Glass — Application</h1>
          <p>
            Edit <code>src/ApplicationHome.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          type="button"
          onClick={() => setCount((c) => c + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
                Next.js docs
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank" rel="noreferrer">
                <img className="button-icon" src={fileSrc(reactLogo)} alt="" />
                Learn React
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Next.js community</p>
          <ul>
            <li>
              <a
                href="https://github.com/vercel/next.js"
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://nextjs.org/discord"
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/nextjs" target="_blank" rel="noreferrer">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}
