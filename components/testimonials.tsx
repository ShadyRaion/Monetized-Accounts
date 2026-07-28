"use client"

import { Star } from "lucide-react"
import { useStoreData } from "@/lib/store-data-context"
import { useState, useEffect, useRef } from "react"

export function Testimonials() {
  const { testimonials, stats, isLoaded } = useStoreData()
  const [isPaused, setIsPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [trackWidth, setTrackWidth] = useState(0)

  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const momentumRef = useRef(0.03)
  const lastTimeRef = useRef<number | null>(null)
  const dragStartXRef = useRef(0)
  const dragStartOffsetRef = useRef(0)
  const lastPointerXRef = useRef(0)
  const lastPointerTimeRef = useRef(0)

  // Only show approved testimonials, no mock data
  const displayTestimonials = testimonials.filter(t => t.status === "approved")
  const repeatedTestimonials = [...displayTestimonials, ...displayTestimonials].map((testimonial, index) => ({
    ...testimonial,
    key: `${testimonial.id}-${index}`
  }))
  const singleTrackWidth = trackWidth / 2
  const animationSpeed = 0.03

  useEffect(() => {
    const measureTrack = () => {
      if (!trackRef.current) return
      setTrackWidth(trackRef.current.scrollWidth)
    }
    measureTrack()
    window.addEventListener('resize', measureTrack)
    return () => window.removeEventListener('resize', measureTrack)
  }, [displayTestimonials.length])

  useEffect(() => {
    if (!trackWidth) return

    let raf = 0
    const step = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
      } else if (!isPaused && !isDragging && singleTrackWidth > 0) {
        const dt = time - lastTimeRef.current
        lastTimeRef.current = time

        momentumRef.current += (animationSpeed - momentumRef.current) * Math.min(1, dt * 0.0015)
        let nextOffset = offsetRef.current + momentumRef.current * dt
        nextOffset = ((nextOffset % singleTrackWidth) + singleTrackWidth) % singleTrackWidth
        offsetRef.current = nextOffset

        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${nextOffset}px)`
        }
      } else {
        lastTimeRef.current = time
      }

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      lastTimeRef.current = null
    }
  }, [trackWidth, isPaused, isDragging, singleTrackWidth])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (displayTestimonials.length === 0) return
    setIsDragging(true)
    setIsPaused(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartXRef.current = event.clientX
    dragStartOffsetRef.current = offsetRef.current
    lastPointerXRef.current = event.clientX
    lastPointerTimeRef.current = performance.now()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const delta = event.clientX - dragStartXRef.current
    let nextOffset = dragStartOffsetRef.current - delta
    if (singleTrackWidth > 0) {
      nextOffset = ((nextOffset % singleTrackWidth) + singleTrackWidth) % singleTrackWidth
    }
    offsetRef.current = nextOffset
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${nextOffset}px)`
    }

    const now = performance.now()
    const elapsed = now - lastPointerTimeRef.current
    if (elapsed > 0) {
      const velocity = (event.clientX - lastPointerXRef.current) / elapsed
      momentumRef.current = -velocity
      lastPointerXRef.current = event.clientX
      lastPointerTimeRef.current = now
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    setIsPaused(false)
  }

  return (
    <section className="relative py-12 sm:py-16 md:py-20 bg-white overflow-hidden">
      <div className="mx-auto w-full px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-2 sm:mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg">
            {stats.totalReviews > 0 
              ? `${stats.totalReviews} verified reviews with ${stats.averageRating} average rating`
              : "Join hundreds of satisfied content creators"
            }
          </p>
        </div>

        {!isLoaded && testimonials.length === 0 ? (
          <div className="flex items-center justify-center min-h-64 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-gray-500 text-sm sm:text-base">Loading reviews...</p>
          </div>
        ) : displayTestimonials.length === 0 ? (
          <div className="flex items-center justify-center min-h-64 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-gray-500 text-sm sm:text-base">No reviews yet. Be the first to leave one!</p>
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
            onMouseEnter={() => !isDragging && setIsPaused(true)}
            onMouseLeave={() => !isDragging && setIsPaused(false)}
          >
            <div
              ref={trackRef}
              className="flex gap-4 sm:gap-6 will-change-transform"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "pan-y", cursor: isDragging ? "grabbing" : "grab", userSelect: "none" }}
            >
              {repeatedTestimonials.map((testimonial) => (
                <div
                  key={testimonial.key}
                  className="flex-shrink-0 min-w-[18rem] max-w-[20rem] bg-gray-50 rounded-3xl p-4 sm:p-6 border border-gray-100 select-none"
                >
                  <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${i < testimonial.rating ? "fill-[#FE2C55] text-[#FE2C55]" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <h4 className="font-bold text-black mb-1 sm:mb-2 text-sm sm:text-base">{testimonial.title}</h4>
                  <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">&ldquo;{testimonial.quote}&rdquo;</p>
                  <p className="text-xs sm:text-sm font-medium text-[#FE2C55]">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
