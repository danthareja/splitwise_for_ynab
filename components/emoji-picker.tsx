"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  label?: string
  description?: string
}

export function EmojiPicker({ value, onChange, label, description }: EmojiPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [emoji, setEmoji] = useState(value || "✅")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEmoji(newValue)
    onChange(newValue)
  }

  const handleFocus = () => {
    // This will trigger the emoji picker on most modern browsers
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="emoji-input">{label}</Label>}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-10 p-0 text-xl"
          onClick={handleFocus}
          aria-label="Select emoji"
        >
          {emoji}
        </Button>
        <Input
          ref={inputRef}
          id="emoji-input"
          name="splitwiseEmoji"
          value={emoji}
          onChange={handleChange}
          className="h-10 w-20 text-center text-xl"
          maxLength={2}
        />
      </div>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  )
}
