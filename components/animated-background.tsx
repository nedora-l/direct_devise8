"use client"

import { useEffect, useRef } from "react"

interface FloatingSymbol {
  x: number
  y: number
  size: number
  speed: number
  symbol: string
  opacity: number
  rotation: number
  rotationSpeed: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Currency symbols to float
    const symbols = ["€", "$", "£", "¥", "₹", "₽", "₿", "د.م", "﷼"]

    // Create floating symbols
    const floatingSymbols: FloatingSymbol[] = []
    const symbolCount = 30

    for (let i = 0; i < symbolCount; i++) {
      floatingSymbols.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 40 + 20,
        speed: Math.random() * 0.5 + 0.2,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        opacity: Math.random() * 0.15 + 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      })
    }

    // Animation loop
    let animationFrameId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      floatingSymbols.forEach((symbol) => {
        // Update position
        symbol.y -= symbol.speed
        symbol.rotation += symbol.rotationSpeed

        // Reset if out of bounds
        if (symbol.y + symbol.size < 0) {
          symbol.y = canvas.height + symbol.size
          symbol.x = Math.random() * canvas.width
        }

        // Draw symbol with rotation
        ctx.save()
        ctx.translate(symbol.x, symbol.y)
        ctx.rotate(symbol.rotation)
        ctx.font = `${symbol.size}px Arial`
        ctx.fillStyle = `rgba(139, 92, 246, ${symbol.opacity})`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(symbol.symbol, 0, 0)
        ctx.restore()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}
