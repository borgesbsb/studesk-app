# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Studesk" [level=1] [ref=e6]
      - paragraph [ref=e7]: Crie sua conta
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Nome
        - textbox "Nome" [ref=e11]:
          - /placeholder: Seu nome
          - text: Test User
      - generic [ref=e12]:
        - generic [ref=e13]: Email
        - textbox "Email" [ref=e14]:
          - /placeholder: seu@email.com
          - text: newuser@test.com
      - generic [ref=e15]:
        - generic [ref=e16]: Senha
        - textbox "Senha" [active] [ref=e17]:
          - /placeholder: ••••••••
          - text: "123"
      - generic [ref=e18]:
        - generic [ref=e19]: Confirmar Senha
        - textbox "Confirmar Senha" [ref=e20]:
          - /placeholder: ••••••••
          - text: "123"
      - button "Criar conta" [ref=e21]
    - paragraph [ref=e23]:
      - text: Já tem uma conta?
      - link "Fazer login" [ref=e24] [cursor=pointer]:
        - /url: /login
  - region "Notifications alt+T"
  - alert [ref=e25]
  - button "Open Next.js Dev Tools" [ref=e31] [cursor=pointer]:
    - img [ref=e32]
```