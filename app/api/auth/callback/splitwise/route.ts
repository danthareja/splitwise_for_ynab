import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Extract the authorization code from the query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code not found" },
        { status: 400 },
      );
    }

    // Prepare the token exchange request
    const tokenUrl = "https://secure.splitwise.com/oauth/token";
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "oTfZZyj0GU2uYkmUfrgj722sex1aIM6XEsbQKUbI",
      client_secret: "9Y2uhQ8KnL9SEW3178I6diE4vl7ISpzmY6HlLjes",
      redirect_uri: "http://localhost:3000/api/auth/callback/splitwise",
      code: code,
    });

    // Make the POST request to exchange the code for tokens
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Token exchange failed", details: errorText },
        { status: response.status },
      );
    }

    const tokenData = await response.json();

    console.log("Token data");
    console.log(tokenData);

    // Return the token data
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error("Error in Splitwise callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
