package model

type CreatePageParams struct {
	Name string `json:"name"`
}

type UpdatePageParams struct {
	Name        string       `json:"name"`
	Nodes       []Node       `json:"nodes,omitempty"`
	Connections []Connection `json:"connections,omitempty"`
}
