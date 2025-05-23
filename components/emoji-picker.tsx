"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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

  // Update local state when prop value changes
  useEffect(() => {
    setEmoji(value || "✅")
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Allow the input to be edited freely
    setEmoji(newValue)

    // Only send the update to parent if we have a valid emoji
    if (newValue) {
      onChange(newValue)
    } else {
      // If the field is cleared, set a default emoji
      onChange("✅")
    }
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
          {emoji || "✅"}
        </Button>
        <Input
          ref={inputRef}
          id="emoji-input"
          name="emoji"
          value={emoji}
          onChange={handleChange}
          className="h-10 w-20 text-center text-xl"
          maxLength={4}
          placeholder="✅"
        />
      </div>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  )
}
